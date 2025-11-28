-- RLS Policies for members table

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Hierarchical view for members" ON public.members;
DROP POLICY IF EXISTS "Users can manage members in their scope" ON public.members;

-- 1. Hierarchical view for members
CREATE POLICY "Hierarchical view for members" ON public.members
  FOR SELECT USING (
    get_my_role() = 'national_coordinator' OR
    (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id()) OR
    (get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id()) OR
    (user_id = auth.uid())
  );

-- 2. Users can manage members in their scope
CREATE POLICY "Users can manage members in their scope" ON public.members
  FOR ALL USING (
    get_my_role() = 'national_coordinator' OR
    (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id()) OR
    (get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id())
  ) WITH CHECK (
    get_my_role() = 'national_coordinator' OR
    (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id()) OR
    (get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id())
  );
