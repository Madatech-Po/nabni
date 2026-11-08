-- Migration: 017_educator_verification_reason.sql
-- Description: NAB-97. The reason an admin gives for rejecting or suspending an educator was
-- only stored in admin_logs, which only admins can read, so the educator never learned why.
-- Keep the latest reason on the educator's own row:
--   * readable by the educator ("Educator manage own profile") and admins, nobody else
--     (the public directory is the educator_directory view, which doesn't include it);
--   * not writable by the educator (their UPDATE grant lists columns, NAB-33);
--   * set only by set_educator_verification(): the reason for rejected/suspended,
--     cleared on any other status.
-- The notifications module (NAB-96) will reuse this column.

ALTER TABLE public.educators ADD COLUMN IF NOT EXISTS verification_reason text;

COMMENT ON COLUMN public.educators.verification_reason IS
  'Latest admin reason for a rejected/suspended status; NULL otherwise. Set by set_educator_verification().';

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
  clean_reason text := NULLIF(trim(p_reason), '');
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
  SET verification_status = p_status,
      verification_reason = CASE
        WHEN p_status IN ('rejected', 'suspended') THEN clean_reason
        ELSE NULL
      END
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
      'reason', clean_reason
    )
  );

  RETURN p_status;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_educator_verification(uuid, public.educator_verification_status, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_educator_verification(uuid, public.educator_verification_status, text)
  TO authenticated;
