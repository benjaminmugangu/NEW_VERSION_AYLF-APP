-- supabase/migrations/004_create_user_profile_trigger.sql

-- 1. Define the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, status, mandate_start_date, mandate_end_date, site_id, small_group_id)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email,
    new.raw_user_meta_data->>'role',
    new.raw_user_meta_data->>'status',
    (new.raw_user_meta_data->>'mandate_start_date')::timestamptz,
    (new.raw_user_meta_data->>'mandate_end_date')::timestamptz,
    (new.raw_user_meta_data->>'site_id')::uuid,
    (new.raw_user_meta_data->>'small_group_id')::uuid
  );
  RETURN new;
END;
$$;

-- 2. Drop the existing trigger, if it exists, to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Create the trigger to execute the function after a new user is created in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
