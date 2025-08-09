// src/services/storageService.ts
import { supabase } from '@/lib/supabaseClient';


// Define a more specific type for the returned data
interface UploadedFileResponse {
  filePath: string;
  publicUrl: string;
}

const storageService = {
  /**
   * Uploads a file to a specified Supabase Storage bucket.
   * @param file The file to upload.
   * @param bucketName The name of the storage bucket (e.g., 'report-images').
   * @returns A service response containing the file path and its public URL.
   */
  uploadFile: async (
    file: File,
    bucketName: string
  ): Promise<UploadedFileResponse> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file);

    if (uploadError) {
      console.error('[StorageService] Storage upload error:', uploadError.message);
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      console.error('[StorageService] Could not retrieve public URL.');
      throw new Error('Could not retrieve public URL for the uploaded file.');
    }

    return {
      filePath: filePath,
      publicUrl: urlData.publicUrl,
    };
  },
};

export { storageService };
