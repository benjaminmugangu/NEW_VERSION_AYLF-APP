-- =====================================================
-- SUPABASE STORAGE RLS POLICIES
-- Bucket: report-images
-- =====================================================

-- CONSTANTS (Mental Model)
-- BUCKET_NAME: 'report-images'
-- ROLE_NATIONAL: 'national_coordinator'
-- ROLE_SITE: 'site_coordinator'
-- ROLE_GROUP: 'small_group_leader'

-- NOTE: These policies must be applied via Supabase Dashboard
-- at: Storage > report-images > Policies

-- =====================================================
-- POLICY 1: Upload Access
-- =====================================================
-- Description: Users can upload images for reports in their scope
-- National coordinators can upload anywhere
-- Site coordinators can upload for their site
-- Small group leaders can upload for their group

CREATE POLICY "Hierarchical upload for report-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'report-images' AND (
    -- National Coordinator: Can upload anywhere
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'national_coordinator'
    OR
    -- Site Coordinator: Can upload for their site
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'site_coordinator'
      AND
      -- File path should contain their site ID (format: {siteId}/...)
      (SELECT site_id::text FROM public.profiles WHERE id = auth.uid()) = split_part(name, '/', 1)
    )
    OR
    -- Small Group Leader: Can upload for their group
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'small_group_leader'
      AND
      -- File path should contain their group ID (format: {siteId}/{groupId}/...)
      (SELECT small_group_id::text FROM public.profiles WHERE id = auth.uid()) = split_part(name, '/', 2)
    )
  )
);

-- =====================================================
-- POLICY 2: Download/View Access
-- =====================================================
-- Description: Users can view images within their hierarchical scope

CREATE POLICY "Hierarchical view for report-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'report-images' AND (
    -- National Coordinator: Can view all images
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'national_coordinator'
    OR
    -- Site Coordinator: Can view images from their site
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'site_coordinator'
      AND
      (SELECT site_id::text FROM public.profiles WHERE id = auth.uid()) = split_part(name, '/', 1)
    )
    OR
    -- Small Group Leader: Can view images from their group
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'small_group_leader'
      AND
      (SELECT small_group_id::text FROM public.profiles WHERE id = auth.uid()) = split_part(name, '/', 2)
    )
  )
);

-- =====================================================
-- POLICY 3: Delete Access
-- =====================================================
-- Description: Only National Coordinators can delete images

CREATE POLICY "National coordinators can delete report-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'report-images' AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'national_coordinator'
);

-- =====================================================
-- POLICY 4: Update Access (Metadata)
-- =====================================================
-- Description: Only National Coordinators can update file metadata

CREATE POLICY "National coordinators can update report-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'report-images' AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'national_coordinator'
);

-- =====================================================
-- IMPLEMENTATION NOTES
-- =====================================================

-- File Naming Convention Required:
-- For proper RLS enforcement, uploaded files MUST follow this structure:
-- 
-- National level: {reportId}/{filename}
-- Site level: {siteId}/{reportId}/{filename}
-- Small group level: {siteId}/{groupId}/{reportId}/{filename}
--
-- This convention allows the RLS policies to parse the path and verify
-- that users only access files within their scope.

-- Example paths:
-- National: 550e8400-e29b-41d4-a716-446655440000/photo1.jpg
-- Site: abc123.../550e8400.../photo1.jpg
-- Group: abc123.../def456.../550e8400.../photo1.jpg

-- =====================================================
-- APPLICATION INSTRUCTIONS
-- =====================================================

-- 1. Open Supabase Dashboard
-- 2. Navigate to: Storage > report-images
-- 3. Click on "Policies" tab
-- 4. Click "New Policy"
-- 5. Paste each policy one at a time
-- 6. Click "Review" then "Save Policy"
-- 7. Repeat for all 4 policies

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- After applying, verify with these queries in SQL Editor:

-- Check policy count (should be 4)
SELECT COUNT(*) FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- List all policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
