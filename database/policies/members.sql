-- RLS Policies for members table

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Hierarchical view for members" ON public.members;
DROP POLICY IF EXISTS "Users can manage members in their scope" ON public.members;

-- 1. Hierarchical view for members
CREATE POLICY "Hierarchical view for members" ON public.members
  FOR SELECT USING (
    get_my_role() = 'NATIONAL_COORDINATOR' OR
    (get_my_role() = 'SITE_COORDINATOR' AND site_id::TEXT = get_my_site_id()) OR
    (get_my_role() = 'SMALL_GROUP_LEADER' AND small_group_id::TEXT = get_my_small_group_id())
  );

-- 2. Users can manage members in their scope
CREATE POLICY "Users can manage members in their scope" ON public.members
  FOR ALL USING (
    get_my_role() = 'NATIONAL_COORDINATOR' OR
    (get_my_role() = 'SITE_COORDINATOR' AND site_id::TEXT = get_my_site_id()) OR
    (get_my_role() = 'SMALL_GROUP_LEADER' AND small_group_id::TEXT = get_my_small_group_id())
  ) WITH CHECK (
    get_my_role() = 'NATIONAL_COORDINATOR' OR
    (get_my_role() = 'SITE_COORDINATOR' AND site_id::TEXT = get_my_site_id()) OR
    (get_my_role() = 'SMALL_GROUP_LEADER' AND small_group_id::TEXT = get_my_small_group_id())
  );
