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
  bucket?: string; // DEFAULT: 'report-images'
}

/**
 * Uploads a file to Supabase Storage.
 * Supports 'report-images' (strict hierarchy) and 'avatars' (user-centric).
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

  // Get user profile for role and scope (needed for report-images hierarchy)
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

  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;

  const bucketName = options.bucket || 'report-images';
  let filePath: string;

  // LOGIC: Bucket-Specific Paths
  if (bucketName === 'avatars') {
    // Path: {userId}/{filename}
    filePath = `${user.id}/${fileName}`;

  } else {
    // DEFAULT: 'report-images' Hierarchical Logic
    const reportId = options.reportId || 'temp';

    if (profile.role === 'NATIONAL_COORDINATOR') {
      filePath = `${reportId}/${fileName}`;
    } else if (profile.role === 'SITE_COORDINATOR') {
      const siteId = options.siteId || profile.siteId;
      if (!siteId) throw new Error('Site ID required for site coordinator uploads');
      filePath = `${siteId}/${reportId}/${fileName}`;
    } else if (profile.role === 'SMALL_GROUP_LEADER') {
      const siteId = options.siteId || profile.siteId;
      const groupId = options.smallGroupId || profile.smallGroupId;
      if (!siteId || !groupId) throw new Error('Site/Group ID required for SGL uploads');
      filePath = `${siteId}/${groupId}/${reportId}/${fileName}`;
    } else {
      throw new Error('Unauthorized: Insufficient permissions to upload files');
    }
  }

  // Convert File to Buffer for server-side upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload using service role key (bypasses RLS)
  const { error: uploadError } = await getSupabaseAdmin().storage
    .from(bucketName)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('[StorageService] Storage upload error:', uploadError.message);
    throw new Error(`Storage upload error: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = getSupabaseAdmin().storage
    .from(bucketName)
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
 * Only National Coordinators are authorized to delete files manually.
 * System rollbacks can bypass auth check (use with caution).
 * 
 * @param filePath - The path of the file to delete
 * @param options - { isRollback: boolean }
 */
export async function deleteFile(
  filePath: string,
  options: { isRollback?: boolean; bucketName?: string } = {}
): Promise<void> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  // Strict Auth Check (skipped if rollback)
  if (!options.isRollback) {
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
  }

  const bucket = options.bucketName || 'report-images';

  const { error } = await getSupabaseAdmin().storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    // CRITICAL: Log failure for visibility as per user request
    console.error('[StorageService] Delete error:', {
      message: error.message,
      filePath,
      isRollback: options.isRollback
    });
    // If rollback, we might want to suppress the throw to not mask the original DB error, 
    // but the system must know. 
    // Plan says: "Assurez-vous que deleteFile() les journaux consignent l'échec... visibilité."
    throw new Error(`Failed to delete file: ${error.message}`);
  } else {
    if (options.isRollback) {
      console.log('[StorageService] Rollback successful:', filePath);
    }
  }
}

// Keep the object for backward compatibility if needed, but exported as named
export const storageService = {
  uploadFile,
  deleteFile,
};
