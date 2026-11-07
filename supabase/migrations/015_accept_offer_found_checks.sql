-- Migration: 015_accept_offer_found_checks.sql
-- Description: NAB-87 (CodeRabbit). accept_offer re-reads the request and offer under lock
-- without checking FOUND; if either was deleted in between, the NULL status made the checks
-- pass silently and the function returned 'accepted' without changing anything.

CREATE OR REPLACE FUNCTION public.accept_offer(p_offer_id uuid)
RETURNS public.offer_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  o public.offers%ROWTYPE;
  request_status text;
BEGIN
  SELECT * INTO o FROM public.offers WHERE id = p_offer_id;
  IF NOT FOUND OR NOT public.is_my_request(o.request_id) THEN
    RAISE EXCEPTION 'Offer not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF NOT public.is_profile_active(auth.uid()) THEN
    RAISE EXCEPTION 'Account suspended' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Lock the request first so two acceptances on the same request queue up.
  SELECT status INTO request_status FROM public.requests WHERE id = o.request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found' USING ERRCODE = 'no_data_found';
  END IF;
  SELECT * INTO o FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found' USING ERRCODE = 'no_data_found';
  END IF;

  IF request_status <> 'open' THEN
    RAISE EXCEPTION 'The request is no longer open' USING ERRCODE = 'check_violation';
  END IF;
  IF o.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending offers can be accepted' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.offers SET status = 'accepted' WHERE id = p_offer_id;
  UPDATE public.offers SET status = 'declined'
    WHERE request_id = o.request_id AND id <> p_offer_id AND status = 'pending';
  UPDATE public.requests SET status = 'closed' WHERE id = o.request_id;

  RETURN 'accepted';
END;
$$;
