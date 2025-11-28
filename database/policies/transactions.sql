-- RLS Policies for transactions table

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Hierarchical view for transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can record transactions in their scope" ON public.transactions;
DROP POLICY IF EXISTS "National Coordinators can manage transactions" ON public.transactions;
DROP POLICY IF EXISTS "National Coordinators can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "National Coordinators can delete transactions" ON public.transactions;

-- 1. Hierarchical view for transactions
CREATE POLICY "Hierarchical view for transactions" ON public.transactions
  FOR SELECT USING (
    get_my_role() = 'national_coordinator' OR
    (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id()) OR
    (get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id())
  );

-- 2. Users can record transactions in their scope
CREATE POLICY "Users can record transactions in their scope" ON public.transactions
  FOR INSERT WITH CHECK (recorded_by = auth.uid());

-- 3. National Coordinators can update transactions
CREATE POLICY "National Coordinators can update transactions" ON public.transactions
  FOR UPDATE USING (get_my_role() = 'national_coordinator');

-- 4. National Coordinators can delete transactions
CREATE POLICY "National Coordinators can delete transactions" ON public.transactions
  FOR DELETE USING (get_my_role() = 'national_coordinator');
