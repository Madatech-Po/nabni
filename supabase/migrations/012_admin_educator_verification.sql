-- Migration: 012_admin_educator_verification.sql
-- Description: NAB-37. Admins can read every educator (any status, including contact details)
-- and change verification status. Writes go only through set_educator_verification(), which
-- checks is_admin() and logs to admin_logs; table-level writes stay locked down (NAB-33).

CREATE POLICY "Admins can view all educators"
  ON public.educators FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all educator subjects"
  ON public.educator_subjects FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all educator levels"
  ON public.educator_levels FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all educator locations"
  ON public.educator_locations FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.set_educator_verification(
  p_educator_id uuid,
  p_status public.educator_verification_status,
  p_reason text DEFAULT NULL
)
RETURNS public.educator_verification_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  old_status public.educator_verification_status;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change educator verification status'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT verification_status INTO old_status
  FROM public.educators
  WHERE id = p_educator_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Educator % not found', p_educator_id USING ERRCODE = 'no_data_found';
  END IF;

  IF old_status IS NOT DISTINCT FROM p_status THEN
    RETURN p_status;
  END IF;

  UPDATE public.educators
  SET verification_status = p_status
  WHERE id = p_educator_id;

  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'educator.verification_status_changed',
    'educator',
    p_educator_id,
    jsonb_build_object(
      'from', old_status,
      'to', p_status,
      'reason', NULLIF(trim(p_reason), '')
    )
  );

  RETURN p_status;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_educator_verification(uuid, public.educator_verification_status, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_educator_verification(uuid, public.educator_verification_status, text)
  TO authenticated;
