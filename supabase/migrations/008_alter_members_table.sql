-- MIGRATION: Add level column and RLS policies to members table

-- 1. Add 'level' column to the members table
ALTER TABLE public.members
ADD COLUMN level TEXT;

-- 2. Enable Row Level Security
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Allow full access to national coordinators" ON public.members;
DROP POLICY IF EXISTS "Allow site coordinators to view and manage their site members" ON public.members;
DROP POLICY IF EXISTS "Allow small group leaders to view their group members" ON public.members;
DROP POLICY IF EXISTS "Allow members to see their own data" ON public.members;
DROP POLICY IF EXISTS "Allow insert for authorized roles" ON public.members;

-- 4. Create RLS policies for SELECT
CREATE POLICY "Allow full access to national coordinators" ON public.members
FOR SELECT USING (get_user_role(auth.uid()) = 'national_coordinator');

CREATE POLICY "Allow site coordinators to view their site members" ON public.members
FOR SELECT USING (get_user_role(auth.uid()) = 'site_coordinator' AND site_id = get_user_site_id(auth.uid()));

CREATE POLICY "Allow small group leaders to view their group members" ON public.members
FOR SELECT USING (get_user_role(auth.uid()) = 'small_group_leader' AND small_group_id = get_user_small_group_id(auth.uid()));

-- 5. Create RLS policies for INSERT
CREATE POLICY "Allow insert for authorized roles" ON public.members
FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) IN ('national_coordinator', 'site_coordinator')
);

-- 6. Create RLS policies for UPDATE
CREATE POLICY "Allow update for authorized roles" ON public.members
FOR UPDATE USING (
  (get_user_role(auth.uid()) = 'national_coordinator') OR
  (get_user_role(auth.uid()) = 'site_coordinator' AND site_id = get_user_site_id(auth.uid()))
) WITH CHECK (
  (get_user_role(auth.uid()) = 'national_coordinator') OR
  (get_user_role(auth.uid()) = 'site_coordinator' AND site_id = get_user_site_id(auth.uid()))
);

-- 7. Create RLS policies for DELETE
CREATE POLICY "Allow delete for authorized roles" ON public.members
FOR DELETE USING (
  (get_user_role(auth.uid()) = 'national_coordinator') OR
  (get_user_role(auth.uid()) = 'site_coordinator' AND site_id = get_user_site_id(auth.uid()))
);
