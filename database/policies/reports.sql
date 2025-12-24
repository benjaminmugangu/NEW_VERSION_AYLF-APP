-- RLS Policies for reports table

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Hierarchical view for reports" ON public.reports;
DROP POLICY IF EXISTS "Users can create their own reports" ON public.reports;
DROP POLICY IF EXISTS "Coordinators can update reports in their scope" ON public.reports;
DROP POLICY IF EXISTS "National Coordinators can delete any report" ON public.reports;

-- 1. Hierarchical view for reports
CREATE POLICY "Hierarchical view for reports" ON public.reports
  FOR SELECT USING (
    get_my_role() = 'NATIONAL_COORDINATOR' OR
    (get_my_role() = 'SITE_COORDINATOR' AND site_id::TEXT = get_my_site_id()) OR
    (get_my_role() = 'SMALL_GROUP_LEADER' AND small_group_id::TEXT = get_my_small_group_id()) OR
    (submitted_by::TEXT = auth.uid()::TEXT)
  );

-- 2. Users can create their own reports
CREATE POLICY "Users can create their own reports" ON public.reports
  FOR INSERT WITH CHECK (submitted_by::TEXT = auth.uid()::TEXT);

-- 3. Coordinators can update reports in their scope
CREATE POLICY "Coordinators can update reports in their scope" ON public.reports
  FOR UPDATE USING (
    get_my_role() = 'NATIONAL_COORDINATOR' OR
    (get_my_role() = 'SITE_COORDINATOR' AND site_id::TEXT = get_my_site_id()) OR
    (get_my_role() = 'SMALL_GROUP_LEADER' AND small_group_id::TEXT = get_my_small_group_id())
  );

-- 4. Coordinators can delete reports in their scope
CREATE POLICY "Coordinators can delete reports in their scope" ON public.reports
  FOR DELETE USING (
    get_my_role() = 'NATIONAL_COORDINATOR' OR
    (get_my_role() = 'SITE_COORDINATOR' AND site_id::TEXT = get_my_site_id()) OR
    (get_my_role() = 'SMALL_GROUP_LEADER' AND small_group_id::TEXT = get_my_small_group_id())
  );
