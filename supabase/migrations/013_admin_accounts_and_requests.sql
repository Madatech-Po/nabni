-- Migration: 013_admin_accounts_and_requests.sql
-- Description: NAB-51. Admins can read every profile and request, suspend/reactivate parent
-- accounts and moderate requests. Suspension is enforced in the database: an inactive user
-- cannot create, edit or delete requests, and their open requests leave the public feed.
-- Requests gain a 'removed' status (hidden by an admin) that the owner can see but not undo.

-- ---------- Helpers (SECURITY DEFINER so policies don't recurse into profiles' RLS) ----------

CREATE OR REPLACE FUNCTION public.is_profile_active(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((SELECT is_active FROM public.profiles WHERE id = p_user_id), false);
$$;

REVOKE EXECUTE ON FUNCTION public.is_profile_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_active(uuid) TO anon, authenticated;

-- ---------- Request status: add 'removed' ----------

ALTER TABLE public.requests DROP CONSTRAINT requests_status_check;
ALTER TABLE public.requests ADD CONSTRAINT requests_status_check
  CHECK (status IN ('open', 'closed', 'cancelled', 'removed'));

-- ---------- Column grants ----------
-- Parents may only write the request's content and (on update) open/close/cancel it.
-- parent_id is set on insert only; id, status on insert, timestamps are never client-written.
REVOKE INSERT, UPDATE ON public.requests FROM anon, authenticated;

GRANT INSERT (parent_id, service_category_id, education_level_id, teaching_place_id, governorate_id,
              city_id, area, student_age, description, preferred_educator_gender, budget, pricing_unit_id)
  ON public.requests TO authenticated;

GRANT UPDATE (service_category_id, education_level_id, teaching_place_id, governorate_id,
              city_id, area, student_age, description, preferred_educator_gender, budget, pricing_unit_id,
              status)
  ON public.requests TO authenticated;

-- Profiles are created only by handle_new_user(); nobody inserts them directly.
REVOKE INSERT ON public.profiles FROM anon, authenticated;

-- ---------- Request policies ----------

DROP POLICY "Open requests are public, own requests always visible" ON public.requests;
CREATE POLICY "Open requests of active parents are public, own requests always visible"
  ON public.requests FOR SELECT
  USING (
    (status = 'open' AND public.is_profile_active(parent_id))
    OR auth.uid() = parent_id
  );

CREATE POLICY "Admins can view all requests"
  ON public.requests FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY "Parents can create their own requests" ON public.requests;
CREATE POLICY "Active parents can create their own requests"
  ON public.requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = parent_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'parent' AND profiles.is_active
    )
  );

DROP POLICY "Parents can update their own requests" ON public.requests;
CREATE POLICY "Active parents can update their own requests"
  ON public.requests FOR UPDATE TO authenticated
  USING (auth.uid() = parent_id AND status <> 'removed' AND public.is_profile_active(auth.uid()))
  WITH CHECK (auth.uid() = parent_id AND status IN ('open', 'closed', 'cancelled'));

DROP POLICY "Parents can delete their own requests" ON public.requests;
CREATE POLICY "Active parents can delete their own requests"
  ON public.requests FOR DELETE TO authenticated
  USING (auth.uid() = parent_id AND status <> 'removed' AND public.is_profile_active(auth.uid()));

-- ---------- Profile policies ----------

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin());

-- ---------- Admin actions ----------

-- Parents only: educators are moderated through set_educator_verification(), and admins
-- can't lock each other (or themselves) out.
CREATE OR REPLACE FUNCTION public.set_profile_active(
  p_user_id uuid,
  p_active boolean,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_role text;
  old_active boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change account status'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_active IS NULL THEN
    RAISE EXCEPTION 'Account status is required' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT role, is_active INTO target_role, old_active
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account % not found', p_user_id USING ERRCODE = 'no_data_found';
  END IF;

  IF target_role <> 'parent' THEN
    RAISE EXCEPTION 'Only parent accounts can be suspended here'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF old_active = p_active THEN
    RETURN p_active;
  END IF;

  UPDATE public.profiles SET is_active = p_active WHERE id = p_user_id;

  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'profile.active_changed',
    'profile',
    p_user_id,
    jsonb_build_object('from', old_active, 'to', p_active, 'reason', NULLIF(trim(p_reason), ''))
  );

  RETURN p_active;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_profile_active(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_profile_active(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_request_status(
  p_request_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  old_status text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can moderate requests'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('open', 'closed', 'cancelled', 'removed') THEN
    RAISE EXCEPTION 'Invalid request status %', p_status USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT status INTO old_status
  FROM public.requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request % not found', p_request_id USING ERRCODE = 'no_data_found';
  END IF;

  IF old_status = p_status THEN
    RETURN p_status;
  END IF;

  UPDATE public.requests SET status = p_status WHERE id = p_request_id;

  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'request.status_changed',
    'request',
    p_request_id,
    jsonb_build_object('from', old_status, 'to', p_status, 'reason', NULLIF(trim(p_reason), ''))
  );

  RETURN p_status;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_request_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_request_status(uuid, text, text) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON public.admin_logs (created_at DESC);
