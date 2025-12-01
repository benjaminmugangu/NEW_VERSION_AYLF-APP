-- RLS Policies for sites table

-- Enable RLS
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can view all sites" ON public.sites;
DROP POLICY IF EXISTS "National Coordinators can manage all sites" ON public.sites;
DROP POLICY IF EXISTS "Hierarchical view for sites" ON public.sites;

-- 1. Hierarchical view for sites
CREATE POLICY "Hierarchical view for sites" ON public.sites
  FOR SELECT USING (
    get_my_role() = 'national_coordinator' OR
    (get_my_role() = 'site_coordinator' AND id = get_my_site_id()) OR
    (get_my_role() = 'small_group_leader' AND id = get_my_site_id()) -- Leaders can see their own site
  );

-- 2. National Coordinators can manage all sites
CREATE POLICY "National Coordinators can manage all sites"
  ON public.sites FOR ALL
  USING (get_my_role() = 'national_coordinator');
