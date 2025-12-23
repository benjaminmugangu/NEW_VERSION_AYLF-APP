-- =====================================================
-- SUPABASE STORAGE RLS POLICIES - VERSION SIMPLIFIÉE
-- Bucket: report-images
-- =====================================================

-- CONSTANTS (Mental Model)
-- BUCKET_NAME: 'report-images'
-- ROLE_NATIONAL: 'national_coordinator'
-- ROLE_SITE: 'site_coordinator'
-- ROLE_GROUP: 'small_group_leader'

-- NOTE: Appliquez ces policies via Supabase Dashboard
-- Storage > report-images > Policies > New Policy

DO $$
DECLARE
    bucket_val TEXT := 'report-images';
    role_nc TEXT := 'national_coordinator';
    role_sc TEXT := 'site_coordinator';
    role_sgl TEXT := 'small_group_leader';
BEGIN
    -- DROP EXISTING
    DROP POLICY IF EXISTS "Hierarchical upload for report-images" ON storage.objects;
    DROP POLICY IF EXISTS "Hierarchical view for report-images" ON storage.objects;
    DROP POLICY IF EXISTS "National coordinators can delete report-images" ON storage.objects;
    DROP POLICY IF EXISTS "National coordinators can update report-images" ON storage.objects;

    -- UPLOAD POLICY
    EXECUTE format('CREATE POLICY "Hierarchical upload for report-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = %L) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = %L AND site_id = split_part(name, %L, 1)) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = %L AND small_group_id = split_part(name, %L, 2))))', bucket_val, role_nc, role_sc, '/', role_sgl, '/');

    -- VIEW POLICY
    EXECUTE format('CREATE POLICY "Hierarchical view for report-images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = %L AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = %L) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = %L AND site_id = split_part(name, %L, 1)) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = %L AND small_group_id = split_part(name, %L, 2))))', bucket_val, role_nc, role_sc, '/', role_sgl, '/');

    -- DELETE POLICY
    EXECUTE format('CREATE POLICY "National coordinators can delete report-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = %L))', bucket_val, role_nc);

    -- UPDATE POLICY
    EXECUTE format('CREATE POLICY "National coordinators can update report-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = %L))', bucket_val, role_nc);
END $$;

-- =====================================================
-- DIFFÉRENCES AVEC LA VERSION PRÉCÉDENTE
-- =====================================================
-- 
-- ✅ Utilise EXISTS au lieu de SELECT direct (plus performant)
-- ✅ Syntaxe simplifiée que Supabase peut parser correctement
-- ✅ Évite les erreurs "syntax error at end of input"
-- ✅ Même logique de sécurité, juste formatée différemment
-- 
-- =====================================================
