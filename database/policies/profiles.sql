-- RLS Policies for profiles table

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir et gérer leurs propres données." ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent voir les profils des autres." ON public.profiles;
DROP POLICY IF EXISTS "Users can see and update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "National Coordinators can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Site Coordinators can manage profiles in their site" ON public.profiles;

-- 1. Users can see and update their own profile.
CREATE POLICY "Users can see and update their own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);

-- 2. National Coordinators can see and update all profiles.
CREATE POLICY "National Coordinators can manage all profiles"
  ON public.profiles FOR ALL
  USING (get_my_role() = 'national_coordinator');

-- 3. Site Coordinators can see and update profiles of users in their own site.
CREATE POLICY "Site Coordinators can manage profiles in their site"
  ON public.profiles FOR ALL
  USING (get_my_role() = 'site_coordinator' AND site_id = get_my_site_id());
