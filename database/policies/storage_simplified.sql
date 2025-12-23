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

-- =====================================================
-- POLICY 1: Upload Access (INSERT)
-- =====================================================
-- Policy name: Hierarchical upload for report-images
-- Allowed operation: INSERT
-- Target roles: authenticated

-- WITH CHECK expression (copiez-collez ceci):

bucket_id = 'report-images' AND (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid()::text 
    AND role = 'national_coordinator'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid()::text 
    AND role = 'site_coordinator'
    AND site_id = split_part(name, '/', 1)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid()::text 
    AND role = 'small_group_leader'
    AND small_group_id = split_part(name, '/', 2)
  )
)

-- =====================================================
-- POLICY 2: View/Download Access (SELECT)
-- =====================================================
-- Policy name: Hierarchical view for report-images
-- Allowed operation: SELECT
-- Target roles: authenticated

-- USING expression (copiez-collez ceci):

bucket_id = 'report-images' AND (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid()::text 
    AND role = 'national_coordinator'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid()::text 
    AND role = 'site_coordinator'
    AND site_id = split_part(name, '/', 1)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid()::text 
    AND role = 'small_group_leader'
    AND small_group_id = split_part(name, '/', 2)
  )
)

-- =====================================================
-- POLICY 3: Delete Access (DELETE)
-- =====================================================
-- Policy name: National coordinators can delete report-images
-- Allowed operation: DELETE
-- Target roles: authenticated

-- USING expression (copiez-collez ceci):

bucket_id = 'report-images' AND EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid()::text 
  AND role = 'national_coordinator'
)

-- =====================================================
-- POLICY 4: Update Access (UPDATE)
-- =====================================================
-- Policy name: National coordinators can update report-images
-- Allowed operation: UPDATE
-- Target roles: authenticated

-- USING expression (copiez-collez ceci):

bucket_id = 'report-images' AND EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid()::text 
  AND role = 'national_coordinator'
)

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
