-- RLS Policies for activities table

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Hierarchical view for all operational data" ON public.activities;
DROP POLICY IF EXISTS "Users can manage activities in their scope" ON public.activities;
DROP POLICY IF EXISTS "Hierarchical view for operational data" ON public.activities;

-- 1. Hierarchical view for activities
CREATE POLICY "Hierarchical view for activities" ON public.activities
  FOR SELECT USING (
    get_my_role() = 'national_coordinator' OR
    (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id()) OR
    (get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id()) OR
    (created_by = auth.uid()) -- A user can see activities they created
  );

-- 2. Users can manage activities in their scope
CREATE POLICY "Users can manage activities in their scope" ON public.activities
  FOR ALL USING (
    get_my_role() = 'national_coordinator' OR
    (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id()) OR
    (get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id())
  ) WITH CHECK (
    get_my_role() = 'national_coordinator' OR
    (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id()) OR
    (get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id())
  );
