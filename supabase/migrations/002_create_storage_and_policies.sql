-- Create the storage bucket for report images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('report-images', 'report-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for the 'report-images' bucket

-- 1. Allow public read access to all files in the bucket
CREATE POLICY "Allow public read access on report images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'report-images');

-- 2. Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload report images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'report-images' AND auth.role() = 'authenticated');

-- 3. Allow users to update their own images
-- Note: This requires a bit more setup to link file ownership to users.
-- A simpler approach for now is to allow authenticated users to update.
-- For more security, you would add user_id to file metadata and check against it.
CREATE POLICY "Allow authenticated users to update report images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'report-images' AND auth.role() = 'authenticated');

-- 4. Allow users to delete their own images
-- Similar to update, this is a simplified policy.
CREATE POLICY "Allow authenticated users to delete report images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'report-images' AND auth.role() = 'authenticated');

-- Grant usage on schema
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO service_role;
