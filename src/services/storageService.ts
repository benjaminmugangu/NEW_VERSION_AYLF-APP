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

  // LOGIC: Use the requested bucket or default to 'report-images'
  const targetBucket = options.bucket || 'report-images';
  const bucketName = targetBucket;
  let filePath: string;

  if (bucketName === 'avatars') {
    // Path: avatars/{userId}/{filename}
    // Note: We prepend 'avatars/' to keep it clean within the shared bucket
    filePath = `${user.id}/${fileName}`;
  } else {
    // DEFAULT: Hierarchical 'report-images' Logic (Activity Reports)
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
    .from(targetBucket)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('[StorageService] Storage upload error:', uploadError.message);
    throw new Error(`Storage upload error: ${uploadError.message}`);
  }

  // Get public URL or placeholder for private bucket logic
  const { data: urlData } = getSupabaseAdmin().storage
    .from(targetBucket)
    .getPublicUrl(filePath);

  return {
    filePath,
    publicUrl: urlData?.publicUrl || '',
  };
}

/**
 * Generates a signed URL for a file in a private bucket.
 */
export async function getSignedUrl(
  filePath: string,
  bucketName: string = 'avatars',
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  const { data, error } = await getSupabaseAdmin().storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error('[StorageService] Error generating signed URL:', error.message);
    throw new Error(`Could not generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Generates multiple signed URLs for files in a private bucket.
 */
export async function getSignedUrls(
  filePaths: string[],
  bucketName: string = 'avatars',
  expiresIn: number = 3600
): Promise<Record<string, string>> {
  if (!filePaths.length) return {};

  const { data, error } = await getSupabaseAdmin().storage
    .from(bucketName)
    .createSignedUrls(filePaths, expiresIn);

  if (error) {
    console.error('[StorageService] Error generating signed URLs:', error.message);
    throw new Error(`Could not generate signed URLs: ${error.message}`);
  }

  const urlMap: Record<string, string> = {};
  data.forEach((item: { path: string; signedUrl: string }) => {
    urlMap[item.path] = item.signedUrl;
  });

  return urlMap;
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

/**
 * Extracts the file path from a Supabase Storage public URL.
 * Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
 */
export function extractFilePath(url: string, bucketName: string = 'report-images'): string {
  if (!url) return '';
  if (!url.startsWith('http')) return url; // Already a path

  const parts = url.split(`/public/${bucketName}/`);
  if (parts.length > 1) {
    return parts[1];
  }

  // Fallback for other patterns or if bucket name is different than expected
  const lastSlashIndex = url.lastIndexOf('/');
  return url.substring(lastSlashIndex + 1);
}

// Keep the object for backward compatibility if needed, but exported as named
export const storageService = {
  uploadFile,
  deleteFile,
};
