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
    get_my_role() = 'national_coordinator' OR
    (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id()) OR
    (get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id()) OR
    (submitted_by = auth.uid())
  );

-- 2. Users can create their own reports
CREATE POLICY "Users can create their own reports" ON public.reports
  FOR INSERT WITH CHECK (submitted_by = auth.uid());

-- 3. Coordinators can update reports in their scope
CREATE POLICY "Coordinators can update reports in their scope" ON public.reports
  FOR UPDATE USING (
    get_my_role() = 'national_coordinator' OR
    (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id())
  );

-- 4. National Coordinators can delete any report
CREATE POLICY "National Coordinators can delete any report" ON public.reports
  FOR DELETE USING (get_my_role() = 'national_coordinator');
