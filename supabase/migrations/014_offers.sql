-- Migration: 014_offers.sql
-- Description: NAB-80. Educators send offers on open requests; parents accept one or decline.
-- Specs: specs/teacher-offers.md, specs/offer-acceptance.md.
--   * Blind bidding: an educator only ever sees their own offers.
--   * Only verified, active educators (with an active account) can offer, and only on open
--     requests of active parents; one pending/accepted offer per educator per request.
--   * Status changes go through functions: withdraw (educator), accept / decline (parent).
--     Accepting closes the request and declines the other pending offers in one transaction.
--   * Closing, cancelling or removing a request archives its pending offers.
--   * Contact details are only handed out for an accepted offer (get_offer_contact).

CREATE TYPE public.offer_status AS ENUM ('pending', 'accepted', 'declined', 'withdrawn', 'archived', 'removed');

CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  educator_id uuid NOT NULL REFERENCES public.educators(id) ON DELETE CASCADE,
  -- The offer keeps its own price, independent of the educator's profile (offer freeze).
  price numeric(10, 2) NOT NULL CHECK (price > 0),
  pricing_unit_id smallint NOT NULL REFERENCES public.pricing_units(id),
  schedule text NOT NULL CHECK (char_length(btrim(schedule)) BETWEEN 5 AND 500),
  start_date date,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  status public.offer_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.offers IS
  'Educator offers on parent requests (NAB-80). Status changes only through the offer functions.';

CREATE UNIQUE INDEX offers_one_active_per_educator
  ON public.offers (request_id, educator_id) WHERE status IN ('pending', 'accepted');
CREATE UNIQUE INDEX offers_one_accepted_per_request
  ON public.offers (request_id) WHERE status = 'accepted';
CREATE INDEX idx_offers_educator ON public.offers (educator_id, created_at DESC);
CREATE INDEX idx_offers_request ON public.offers (request_id, created_at);

CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Helpers (SECURITY DEFINER: the offers and requests policies refer to each other) ----------

-- The caller's educator row, but only while they may send offers.
CREATE OR REPLACE FUNCTION public.my_offering_educator_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.id
  FROM public.educators e
  JOIN public.profiles p ON p.id = e.user_id
  WHERE e.user_id = auth.uid()
    AND e.verification_status = 'verified'
    AND e.is_active
    AND p.is_active;
$$;

CREATE OR REPLACE FUNCTION public.is_my_educator(p_educator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.educators WHERE id = p_educator_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_my_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.requests WHERE id = p_request_id AND parent_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.request_accepts_offers(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = p_request_id AND r.status = 'open' AND public.is_profile_active(r.parent_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.i_offered_on(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.offers o
    JOIN public.educators e ON e.id = o.educator_id
    WHERE o.request_id = p_request_id AND e.user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.my_offering_educator_id(), public.is_my_educator(uuid),
  public.is_my_request(uuid), public.request_accepts_offers(uuid), public.i_offered_on(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_offering_educator_id(), public.is_my_educator(uuid),
  public.is_my_request(uuid), public.request_accepts_offers(uuid), public.i_offered_on(uuid)
  TO authenticated;

-- ---------- Grants and RLS ----------

REVOKE ALL ON public.offers FROM anon, authenticated;
GRANT SELECT ON public.offers TO authenticated;
GRANT INSERT (request_id, educator_id, price, pricing_unit_id, schedule, start_date, notes)
  ON public.offers TO authenticated;
GRANT UPDATE (price, pricing_unit_id, schedule, start_date, notes) ON public.offers TO authenticated;

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Educators see their own offers"
  ON public.offers FOR SELECT TO authenticated
  USING (public.is_my_educator(educator_id));

CREATE POLICY "Parents see offers on their requests"
  ON public.offers FOR SELECT TO authenticated
  USING (public.is_my_request(request_id));

CREATE POLICY "Admins see all offers"
  ON public.offers FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Verified educators offer on open requests"
  ON public.offers FOR INSERT TO authenticated
  WITH CHECK (
    educator_id = public.my_offering_educator_id()
    AND public.request_accepts_offers(request_id)
  );

CREATE POLICY "Educators edit their pending offers on open requests"
  ON public.offers FOR UPDATE TO authenticated
  USING (
    status = 'pending'
    AND educator_id = public.my_offering_educator_id()
    AND public.request_accepts_offers(request_id)
  )
  WITH CHECK (status = 'pending' AND educator_id = public.my_offering_educator_id());

-- An educator keeps seeing the requests they offered on after those close.
CREATE POLICY "Educators see requests they offered on"
  ON public.requests FOR SELECT TO authenticated
  USING (public.i_offered_on(id));

-- ---------- Status changes ----------

CREATE OR REPLACE FUNCTION public.withdraw_offer(p_offer_id uuid)
RETURNS public.offer_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  o public.offers%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_my_educator(o.educator_id) THEN
    RAISE EXCEPTION 'Offer not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF o.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending offers can be withdrawn' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.offers SET status = 'withdrawn' WHERE id = p_offer_id;
  RETURN 'withdrawn';
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_offer(p_offer_id uuid)
RETURNS public.offer_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  o public.offers%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_my_request(o.request_id) THEN
    RAISE EXCEPTION 'Offer not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF NOT public.is_profile_active(auth.uid()) THEN
    RAISE EXCEPTION 'Account suspended' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF o.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending offers can be declined' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.offers SET status = 'declined' WHERE id = p_offer_id;
  RETURN 'declined';
END;
$$;

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
  SELECT * INTO o FROM public.offers WHERE id = p_offer_id FOR UPDATE;

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

REVOKE EXECUTE ON FUNCTION public.withdraw_offer(uuid), public.decline_offer(uuid), public.accept_offer(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_offer(uuid), public.decline_offer(uuid), public.accept_offer(uuid)
  TO authenticated;

-- When a request stops being open, its pending offers are archived (accepted ones stay).
CREATE OR REPLACE FUNCTION public.archive_offers_of_closed_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'open' AND NEW.status <> 'open' THEN
    UPDATE public.offers SET status = 'archived' WHERE request_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.archive_offers_of_closed_request() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER archive_offers_when_request_closes
  AFTER UPDATE OF status ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.archive_offers_of_closed_request();

-- ---------- Contacts, only for an accepted offer ----------

-- The other side's name and numbers: the educator's for the parent, the parent's for the
-- educator. Returns no row for anyone else or for an offer that isn't accepted.
CREATE OR REPLACE FUNCTION public.get_offer_contact(p_offer_id uuid)
RETURNS TABLE (full_name text, phone text, whatsapp_number text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.full_name, e.phone, e.whatsapp_number
  FROM public.offers o
  JOIN public.requests r ON r.id = o.request_id
  JOIN public.educators e ON e.id = o.educator_id
  WHERE o.id = p_offer_id AND o.status = 'accepted' AND r.parent_id = auth.uid()
  UNION ALL
  SELECT p.full_name, p.phone, NULL
  FROM public.offers o
  JOIN public.requests r ON r.id = o.request_id
  JOIN public.educators e ON e.id = o.educator_id
  JOIN public.profiles p ON p.id = r.parent_id
  WHERE o.id = p_offer_id AND o.status = 'accepted' AND e.user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_offer_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_offer_contact(uuid) TO authenticated;
