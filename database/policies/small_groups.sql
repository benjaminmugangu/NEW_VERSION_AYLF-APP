-- RLS Policies for small_groups table

-- Enable RLS
ALTER TABLE public.small_groups ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can view all small groups" ON public.small_groups;
DROP POLICY IF EXISTS "Coordinators can manage small groups" ON public.small_groups;
DROP POLICY IF EXISTS "Hierarchical view for small groups" ON public.small_groups;

-- 1. Hierarchical view for small groups
CREATE POLICY "Hierarchical view for small groups" ON public.small_groups
  FOR SELECT USING (
    get_my_role() = 'NATIONAL_COORDINATOR' OR
    (get_my_role() = 'SITE_COORDINATOR' AND site_id::TEXT = get_my_site_id()) OR
    (get_my_role() = 'SMALL_GROUP_LEADER' AND id::TEXT = get_my_small_group_id()) -- Leaders can see their own group
  );

-- 2. Coordinators can manage small groups
CREATE POLICY "Coordinators can manage small groups"
  ON public.small_groups FOR ALL
  USING (
    get_my_role() = 'NATIONAL_COORDINATOR' OR
    (get_my_role() = 'SITE_COORDINATOR' AND site_id::TEXT = get_my_site_id())
  );
