-- Migration: 016_admin_remove_offer.sql
-- Description: NAB-86. Admins can remove an inappropriate offer (pending or accepted). The
-- offer is kept with status 'removed' so the history stays, and the action is logged.
-- Removing an accepted offer also takes the contacts away (get_offer_contact needs 'accepted').

CREATE OR REPLACE FUNCTION public.remove_offer(p_offer_id uuid, p_reason text DEFAULT NULL)
RETURNS public.offer_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  old_status public.offer_status;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can remove offers' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT status INTO old_status FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer % not found', p_offer_id USING ERRCODE = 'no_data_found';
  END IF;
  IF old_status = 'removed' THEN
    RETURN 'removed';
  END IF;
  IF old_status NOT IN ('pending', 'accepted') THEN
    RAISE EXCEPTION 'Only pending or accepted offers can be removed' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.offers SET status = 'removed' WHERE id = p_offer_id;

  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'offer.removed',
    'offer',
    p_offer_id,
    jsonb_build_object('from', old_status, 'to', 'removed', 'reason', NULLIF(trim(p_reason), ''))
  );

  RETURN 'removed';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.remove_offer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_offer(uuid, text) TO authenticated;
