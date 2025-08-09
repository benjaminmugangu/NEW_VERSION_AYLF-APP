-- MIGRATION: Add 'level' column and RLS policies to the 'members' table.

-- 1. Add the 'level' column to store the member's level (national, site, small_group).
ALTER TABLE public.members
ADD COLUMN level TEXT;

-- 2. Enable Row Level Security on the 'members' table.
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- 3. Drop any potentially conflicting policies that might exist from manual attempts.
DROP POLICY IF EXISTS "Allow read access based on user role" ON public.members;
DROP POLICY IF EXISTS "Allow insert for authorized roles" ON public.members;
DROP POLICY IF EXISTS "Allow update for authorized roles" ON public.members;
DROP POLICY IF EXISTS "Allow delete for authorized roles" ON public.members;

-- 4. Create SELECT (read) policy.
-- Users can see members based on their hierarchical level.
CREATE POLICY "Allow read access based on user role" ON public.members
FOR SELECT USING (
  (get_my_role() = 'national_coordinator') OR
  (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id()) OR
  (get_my_role() = 'small_group_leader' AND small_group_id = get_my_small_group_id())
);

-- 5. Create INSERT (create) policy.
-- National and Site coordinators can create new members.
CREATE POLICY "Allow insert for authorized roles" ON public.members
FOR INSERT WITH CHECK (
  get_my_role() IN ('national_coordinator', 'site_coordinator')
);

-- 6. Create UPDATE (edit) policy.
-- National coordinators can edit any member.
-- Site coordinators can only edit members within their own site.
CREATE POLICY "Allow update for authorized roles" ON public.members
FOR UPDATE USING (
  (get_my_role() = 'national_coordinator') OR
  (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id())
);

-- 7. Create DELETE policy.
-- National coordinators can delete any member.
-- Site coordinators can only delete members within their own site.
CREATE POLICY "Allow delete for authorized roles" ON public.members
FOR DELETE USING (
  (get_my_role() = 'national_coordinator') OR
  (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id())
);
