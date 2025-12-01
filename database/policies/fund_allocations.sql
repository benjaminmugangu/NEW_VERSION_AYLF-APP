-- RLS Policies for fund_allocations table

-- Enable RLS
ALTER TABLE public.fund_allocations ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Hierarchical view for fund allocations" ON public.fund_allocations;
DROP POLICY IF EXISTS "Coordinators can create allocations" ON public.fund_allocations;
DROP POLICY IF EXISTS "National Coordinators can manage fund allocations" ON public.fund_allocations;
DROP POLICY IF EXISTS "National Coordinators can update fund allocations" ON public.fund_allocations;
DROP POLICY IF EXISTS "National Coordinators can delete fund allocations" ON public.fund_allocations;

-- 1. Hierarchical view for fund allocations
CREATE POLICY "Hierarchical view for fund allocations" ON public.fund_allocations
  FOR SELECT USING (
    get_my_role() = 'national_coordinator' OR
    (get_my_role() = 'site_coordinator' AND recipient_site_id = get_my_site_id()) OR
    (get_my_role() = 'small_group_leader' AND recipient_small_group_id = get_my_small_group_id())
  );

-- 2. Coordinators can create allocations
CREATE POLICY "Coordinators can create allocations" ON public.fund_allocations
  FOR INSERT WITH CHECK (
    (get_my_role() = 'national_coordinator' AND sender_id = auth.uid()) OR
    (get_my_role() = 'site_coordinator' AND sender_id = auth.uid())
  );

-- 3. National Coordinators can update fund allocations
CREATE POLICY "National Coordinators can update fund allocations" ON public.fund_allocations
  FOR UPDATE USING (get_my_role() = 'national_coordinator');

-- 4. National Coordinators can delete fund allocations
CREATE POLICY "National Coordinators can delete fund allocations" ON public.fund_allocations
  FOR DELETE USING (get_my_role() = 'national_coordinator');
