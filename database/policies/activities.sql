-- RLS Policies for activities table

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Hierarchical view for all operational data" ON public.activities;
DROP POLICY IF EXISTS "Users can manage activities in their scope" ON public.activities;
DROP POLICY IF EXISTS "Hierarchical view for operational data" ON public.activities;

DO $$
DECLARE
    role_nc TEXT := 'NATIONAL_COORDINATOR';
    role_sc TEXT := 'SITE_COORDINATOR';
    role_sgl TEXT := 'SMALL_GROUP_LEADER';
BEGIN
    -- 1. Hierarchical view for activities
    EXECUTE format('
    CREATE POLICY "Hierarchical view for activities" ON public.activities
      FOR SELECT USING (
        get_my_role() = %L OR
        (get_my_role() = %L AND site_id::TEXT = get_my_site_id()) OR
        (get_my_role() = %L AND small_group_id::TEXT = get_my_small_group_id()) OR
        (created_by::TEXT = auth.uid()::TEXT)
      )', role_nc, role_sc, role_sgl);

    -- 2. Users can manage activities in their scope
    EXECUTE format('
    CREATE POLICY "Users can manage activities in their scope" ON public.activities
      FOR ALL USING (
        get_my_role() = %L OR
        (get_my_role() = %L AND site_id::TEXT = get_my_site_id()) OR
        (get_my_role() = %L AND small_group_id::TEXT = get_my_small_group_id())
      ) WITH CHECK (
        get_my_role() = %L OR
        (get_my_role() = %L AND site_id::TEXT = get_my_site_id()) OR
        (get_my_role() = %L AND small_group_id::TEXT = get_my_small_group_id())
      )', role_nc, role_sc, role_sgl, role_nc, role_sc, role_sgl);
END $$;
