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

DO $$
DECLARE
    bucket_val TEXT := 'report-images';
    role_nc TEXT := 'NATIONAL_COORDINATOR';
    role_sc TEXT := 'SITE_COORDINATOR';
    role_sgl TEXT := 'SMALL_GROUP_LEADER';
BEGIN
    -- DROP EXISTING
    DROP POLICY IF EXISTS "Hierarchical upload for report-images" ON storage.objects;
    DROP POLICY IF EXISTS "Hierarchical view for report-images" ON storage.objects;
    DROP POLICY IF EXISTS "National coordinators can delete report-images" ON storage.objects;
    DROP POLICY IF EXISTS "National coordinators can update report-images" ON storage.objects;

    -- UPLOAD POLICY
    EXECUTE format('CREATE POLICY "Hierarchical upload for report-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L AND ((SELECT role FROM public.profiles WHERE id = get_my_id()) = %L OR ((SELECT role FROM public.profiles WHERE id = get_my_id()) = %L AND (SELECT site_id::text FROM public.profiles WHERE id = get_my_id()) = split_part(name, %L, 1)) OR ((SELECT role FROM public.profiles WHERE id = get_my_id()) = %L AND (SELECT small_group_id::text FROM public.profiles WHERE id = get_my_id()) = split_part(name, %L, 2))))', bucket_val, role_nc, role_sc, '/', role_sgl, '/');

    -- VIEW POLICY
    EXECUTE format('CREATE POLICY "Hierarchical view for report-images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = %L AND ((SELECT role FROM public.profiles WHERE id = get_my_id()) = %L OR ((SELECT role FROM public.profiles WHERE id = get_my_id()) = %L AND (SELECT site_id::text FROM public.profiles WHERE id = get_my_id()) = split_part(name, %L, 1)) OR ((SELECT role FROM public.profiles WHERE id = get_my_id()) = %L AND (SELECT small_group_id::text FROM public.profiles WHERE id = get_my_id()) = split_part(name, %L, 2))))', bucket_val, role_nc, role_sc, '/', role_sgl, '/');

    -- DELETE POLICY
    EXECUTE format('CREATE POLICY "National coordinators can delete report-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L AND (SELECT role FROM public.profiles WHERE id = get_my_id()) = %L)', bucket_val, role_nc);

    -- UPDATE POLICY
    EXECUTE format('CREATE POLICY "National coordinators can update report-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L AND (SELECT role FROM public.profiles WHERE id = get_my_id()) = %L)', bucket_val, role_nc);
END $$;

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
