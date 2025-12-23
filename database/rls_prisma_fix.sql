-- Update RLS helper functions to support Prisma-based session variables
-- These allow RLS to work even when auth.uid() is null (e.g. from Prisma)

-- Helper to get the current user ID from either Supabase Auth or our custom session variable
-- Returns TEXT to match profiles.id column type (String in Prisma)
CREATE OR REPLACE FUNCTION get_my_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.uid()::text,
    current_setting('app.current_user_id', true)
  );
$$;

-- Returns the current user's role as TEXT
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT role::text FROM public.profiles WHERE id = get_my_id();
$$;

-- Returns the current user's site_id as TEXT (matches String type in Prisma)
CREATE OR REPLACE FUNCTION get_my_site_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT site_id FROM public.profiles WHERE id = get_my_id();
$$;

-- Returns the current user's small_group_id as TEXT (matches String type in Prisma)
CREATE OR REPLACE FUNCTION get_my_small_group_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT small_group_id FROM public.profiles WHERE id = get_my_id();
$$;
