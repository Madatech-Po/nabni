-- Migration: 002_profiles_policies_and_signup_trigger.sql
-- Description: NAB-24. profiles had RLS enabled but no policies (nobody could read or write
-- it) and nothing created a profile on signup.

-- 1. Owners can read and update their own profile. Rows are only ever created by the
-- signup trigger below, so there is no INSERT policy.
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users must not be able to change their own role (e.g. to admin) or activation flag, so
-- UPDATE is granted on the editable columns only.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, phone, avatar_url, governorate_id, city, onboarding_completed)
  ON public.profiles TO authenticated;

-- 2. Create a profile for every new auth user from the signup metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_role text := new.raw_user_meta_data->>'role';
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    new.id,
    -- 'teacher' is the legacy name used by older signup forms; admins are never self-assigned.
    CASE
      WHEN requested_role IN ('educator', 'teacher') THEN 'educator'
      ELSE 'parent'
    END,
    COALESCE(
      NULLIF(trim(new.raw_user_meta_data->>'full_name'), ''),
      NULLIF(trim(concat_ws(' ', trim(new.raw_user_meta_data->>'first_name'), trim(new.raw_user_meta_data->>'last_name'))), ''),
      split_part(new.email, '@', 1)
    )
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill users who signed up before the trigger existed.
INSERT INTO public.profiles (id, role, full_name)
SELECT
  u.id,
  CASE WHEN u.raw_user_meta_data->>'role' IN ('educator', 'teacher') THEN 'educator' ELSE 'parent' END,
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(concat_ws(' ', trim(u.raw_user_meta_data->>'first_name'), trim(u.raw_user_meta_data->>'last_name'))), ''),
    split_part(u.email, '@', 1)
  )
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);
