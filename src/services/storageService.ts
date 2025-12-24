import { createClient } from '@supabase/supabase-js';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from '@/lib/prisma';

// Lazy-initialized Supabase client
let _supabaseAdmin: any = null;

function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
  }

  _supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  return _supabaseAdmin;
}

interface UploadedFileResponse {
  filePath: string;
  publicUrl: string;
}

interface UploadOptions {
  reportId?: string;
  siteId?: string;
  smallGroupId?: string;
}

/**
 * Uploads a file to the report-images bucket with proper RLS-compatible path structure.
 * 
 * Path structure based on user scope:
 * - National: {reportId}/{filename}
 * - Site: {siteId}/{reportId}/{filename}
 * - Small Group: {siteId}/{groupId}/{reportId}/{filename}
 * 
 * @param file - The file to upload
 * @param options - Upload options (reportId, siteId, smallGroupId)
 * @returns Upload result with file path and public URL
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadedFileResponse> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user?.id) {
    throw new Error('Unauthorized: User must be authenticated to upload files');
  }

  // Get user profile for role and scope
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      role: true,
      siteId: true,
      smallGroupId: true,
    }
  });

  if (!profile) {
    throw new Error('User profile not found');
  }

  // Generate file path based on user role and scope
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;

  let filePath: string;
  const reportId = options.reportId || 'temp';

  if (profile.role === 'NATIONAL_COORDINATOR') {
    // National level: {reportId}/{filename}
    filePath = `${reportId}/${fileName}`;
  } else if (profile.role === 'SITE_COORDINATOR') {
    // Site level: {siteId}/{reportId}/{filename}
    const siteId = options.siteId || profile.siteId;
    if (!siteId) {
      throw new Error('Site ID required for site coordinator uploads');
    }
    filePath = `${siteId}/${reportId}/${fileName}`;
  } else if (profile.role === 'SMALL_GROUP_LEADER') {
    // Small group level: {siteId}/{groupId}/{reportId}/{filename}
    const siteId = options.siteId || profile.siteId;
    const groupId = options.smallGroupId || profile.smallGroupId;
    if (!siteId || !groupId) {
      throw new Error('Site ID and Small Group ID required for small group leader uploads');
    }
    filePath = `${siteId}/${groupId}/${reportId}/${fileName}`;
  } else {
    throw new Error('Unauthorized: Insufficient permissions to upload files');
  }

  // Convert File to Buffer for server-side upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload using service role key (bypasses RLS)
  const { error: uploadError } = await getSupabaseAdmin().storage
    .from('report-images')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false, // Don't overwrite existing files
    });

  if (uploadError) {
    console.error('[StorageService] Storage upload error:', uploadError.message);
    throw new Error(`Storage upload error: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = getSupabaseAdmin().storage
    .from('report-images')
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    console.error('[StorageService] Could not retrieve public URL.');
    throw new Error('Could not retrieve public URL for the uploaded file.');
  }

  return {
    filePath,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * Deletes a file from storage.
 * Only National Coordinators are authorized to delete files.
 * 
 * @param filePath - The path of the file to delete
 */
export async function deleteFile(filePath: string): Promise<void> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user?.id) {
    throw new Error('Unauthorized: User must be authenticated');
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true }
  });

  if (profile?.role !== 'NATIONAL_COORDINATOR') {
    throw new Error('Unauthorized: Only National Coordinators can delete files');
  }

  const { error } = await getSupabaseAdmin().storage
    .from('report-images')
    .remove([filePath]);

  if (error) {
    console.error('[StorageService] Delete error:', error.message);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

// Keep the object for backward compatibility if needed, but exported as named
export const storageService = {
  uploadFile,
  deleteFile,
};
