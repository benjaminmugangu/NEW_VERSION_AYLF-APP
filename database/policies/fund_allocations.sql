-- RLS Policies for fund_allocations table

-- Enable RLS
ALTER TABLE public.fund_allocations ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Hierarchical view for fund allocations" ON public.fund_allocations;
DROP POLICY IF EXISTS "Coordinators can create allocations" ON public.fund_allocations;
DROP POLICY IF EXISTS "National Coordinators can manage fund allocations" ON public.fund_allocations;
DROP POLICY IF EXISTS "National Coordinators can update fund allocations" ON public.fund_allocations;
DROP POLICY IF EXISTS "National Coordinators can delete fund allocations" ON public.fund_allocations;

DO $$
DECLARE
    role_nc TEXT := 'NATIONAL_COORDINATOR';
    role_sc TEXT := 'SITE_COORDINATOR';
    role_sgl TEXT := 'SMALL_GROUP_LEADER';
BEGIN
    -- 1. Hierarchical view for fund allocations
    EXECUTE format('
    CREATE POLICY "Hierarchical view for fund allocations" ON public.fund_allocations
      FOR SELECT USING (
        get_my_role() = %1$L OR
        (get_my_role() = %2$L AND site_id::TEXT = get_my_site_id()) OR
        (get_my_role() = %3$L AND small_group_id::TEXT = get_my_small_group_id())
      )', role_nc, role_sc, role_sgl);

    -- 2. Hybrid allocation enforcement for INSERT
    EXECUTE format('
    CREATE POLICY "Hybrid allocation enforcement" ON public.fund_allocations
      FOR INSERT WITH CHECK (
        -- NC hierarchical: Can allocate to Sites ONLY (not Small Groups)
        (get_my_role() = %1$L
         AND allocated_by_id::TEXT = get_my_id()
         AND allocation_type = ''hierarchical''
         AND site_id IS NOT NULL
         AND small_group_id IS NULL)
        OR
        -- NC direct: Can allocate to Small Groups with required justification
        (get_my_role() = %1$L
         AND allocated_by_id::TEXT = get_my_id()
         AND allocation_type = ''direct''
         AND small_group_id IS NOT NULL
         AND bypass_reason IS NOT NULL
         AND LENGTH(bypass_reason) >= 20)
        OR
        -- SC hierarchical: Can allocate to Small Groups within their site
        (get_my_role() = %2$L
         AND allocated_by_id::TEXT = get_my_id()
         AND allocation_type = ''hierarchical''
         AND site_id::TEXT = get_my_site_id()
         AND small_group_id IS NOT NULL)
      )', role_nc, role_sc);

    -- 3. National Coordinators can update fund allocations
    EXECUTE format('
    CREATE POLICY "National Coordinators can update fund allocations" ON public.fund_allocations
      FOR UPDATE USING (get_my_role() = %L)', role_nc);

    -- 4. National Coordinators can delete fund allocations
    EXECUTE format('
    CREATE POLICY "National Coordinators can delete fund allocations" ON public.fund_allocations
      FOR DELETE USING (get_my_role() = %L)', role_nc);
END $$;
