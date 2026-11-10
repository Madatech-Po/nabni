-- Migration: 020_parent_notifications.sql
-- Description: NAB-110 (epic NAB-105). Parents get an in-app notification (via notify(), 018)
-- about offers on their requests and about admin decisions on their requests and account.
-- Recipient = requests.parent_id (a profiles.id).
--
-- How:
--   * Offers, as AFTER triggers on public.offers (every code path is covered):
--       - INSERT (an educator sends an offer)                -> offer.received
--       - client edit of price / pricing_unit_id / schedule / start_date / notes on a pending
--         offer, when a value really changes                 -> offer.updated
--         Coalesced: skipped while the parent still has an UNREAD offer.updated for the same
--         offer created in the last 10 minutes, so a burst of edits is one notification.
--       - status -> withdrawn                                -> offer.withdrawn
--     -> accepted / declined are the parent's own actions; -> archived / removed are the
--     educator's news (019). None of them notify the parent.
--   * Request moderation: inside set_request_status() only, because the admin's reason exists
--     only there, and so a parent closing/reopening/cancelling their own request (or
--     accept_offer() closing it) never notifies them:
--       - -> removed                 -> request.removed (+ reason)
--       - removed -> open            -> request.restored
--       - -> closed / cancelled      -> request.closed_by_admin (+ reason)
--   * Account: inside set_profile_active() (parents only, as before):
--       - suspended   -> account.suspended (+ reason), link /parent
--       - reactivated -> account.reactivated, link /parent
--   * No-ops (same status / same active flag / same values) create nothing.
--   * set_request_status() and set_profile_active() keep their signature, checks, admin_logs
--     entry and grants exactly as in 013; only the notify() call is added.
--   * Trigger functions are SECURITY DEFINER (notify() is not callable by clients) and nobody
--     may call them directly.

-- ---------- Offers on the parent's requests ----------

CREATE OR REPLACE FUNCTION public.notify_parent_offer_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.notify(
    (SELECT parent_id FROM public.requests WHERE id = NEW.request_id),
    'offer.received',
    'وصلك عرض جديد على طلبك',
    'راجع العرض وقارنه بالعروض الأخرى قبل أن تختار.',
    '/parent/requests/' || NEW.request_id,
    jsonb_build_object('offer_id', NEW.id, 'request_id', NEW.request_id));
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_parent_offer_received() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_parent_on_offer_insert ON public.offers;
CREATE TRIGGER notify_parent_on_offer_insert
  AFTER INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.notify_parent_offer_received();

CREATE OR REPLACE FUNCTION public.notify_parent_offer_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient uuid;
BEGIN
  SELECT parent_id INTO recipient FROM public.requests WHERE id = NEW.request_id;

  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE recipient_id = recipient
      AND type = 'offer.updated'
      AND read_at IS NULL
      AND data->>'offer_id' = NEW.id::text
      AND created_at > now() - interval '10 minutes'
  ) THEN
    RETURN NULL;
  END IF;

  PERFORM public.notify(
    recipient,
    'offer.updated',
    'عدّل المتخصص عرضه على طلبك',
    'راجع التفاصيل الجديدة للعرض.',
    '/parent/requests/' || NEW.request_id,
    jsonb_build_object('offer_id', NEW.id, 'request_id', NEW.request_id));
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_parent_offer_updated() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_parent_on_offer_edit ON public.offers;
CREATE TRIGGER notify_parent_on_offer_edit
  AFTER UPDATE OF price, pricing_unit_id, schedule, start_date, notes ON public.offers
  FOR EACH ROW
  WHEN (
    OLD.status = 'pending' AND NEW.status = 'pending'
    AND (OLD.price, OLD.pricing_unit_id, OLD.schedule, OLD.start_date, OLD.notes)
        IS DISTINCT FROM (NEW.price, NEW.pricing_unit_id, NEW.schedule, NEW.start_date, NEW.notes)
  )
  EXECUTE FUNCTION public.notify_parent_offer_updated();

CREATE OR REPLACE FUNCTION public.notify_parent_offer_withdrawn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.notify(
    (SELECT parent_id FROM public.requests WHERE id = NEW.request_id),
    'offer.withdrawn',
    'سحب المتخصص عرضه',
    'لم يعد هذا العرض متاحًا على طلبك.',
    '/parent/requests/' || NEW.request_id,
    jsonb_build_object('offer_id', NEW.id, 'request_id', NEW.request_id));
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_parent_offer_withdrawn() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_parent_on_offer_withdrawn ON public.offers;
CREATE TRIGGER notify_parent_on_offer_withdrawn
  AFTER UPDATE OF status ON public.offers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'withdrawn')
  EXECUTE FUNCTION public.notify_parent_offer_withdrawn();

-- ---------- Admin account decisions: same as 013, plus the notification ----------

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
  clean_reason text := NULLIF(trim(p_reason), '');
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

  IF p_active THEN
    PERFORM public.notify(
      p_user_id, 'account.reactivated', 'تمت إعادة تفعيل حسابك',
      'يمكنك الآن نشر الطلبات ومتابعة العروض من جديد.', '/parent',
      '{}'::jsonb);
  ELSE
    PERFORM public.notify(
      p_user_id, 'account.suspended', 'تم إيقاف حسابك',
      CASE WHEN clean_reason IS NOT NULL THEN 'السبب: ' || clean_reason
           ELSE 'تواصل مع الإدارة لمعرفة التفاصيل.' END,
      '/parent',
      jsonb_build_object('reason', clean_reason));
  END IF;

  RETURN p_active;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_profile_active(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_profile_active(uuid, boolean, text) TO authenticated;

-- ---------- Admin request moderation: same as 013, plus the notification ----------

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
  owner_id uuid;
  clean_reason text := NULLIF(trim(p_reason), '');
  request_link text := '/parent/requests/' || p_request_id;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can moderate requests'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('open', 'closed', 'cancelled', 'removed') THEN
    RAISE EXCEPTION 'Invalid request status %', p_status USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT status, parent_id INTO old_status, owner_id
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

  IF p_status = 'removed' THEN
    PERFORM public.notify(
      owner_id, 'request.removed', 'تم إخفاء طلبك من قِبل الإدارة',
      CASE WHEN clean_reason IS NOT NULL THEN 'السبب: ' || clean_reason
           ELSE 'تواصل مع الإدارة لمعرفة التفاصيل.' END,
      request_link,
      jsonb_build_object('request_id', p_request_id, 'reason', clean_reason));
  ELSIF p_status = 'open' AND old_status = 'removed' THEN
    PERFORM public.notify(
      owner_id, 'request.restored', 'تمت إعادة نشر طلبك',
      'طلبك ظاهر من جديد ويستقبل العروض.', request_link,
      jsonb_build_object('request_id', p_request_id));
  ELSIF p_status IN ('closed', 'cancelled') THEN
    PERFORM public.notify(
      owner_id, 'request.closed_by_admin', 'تم إغلاق طلبك من قِبل الإدارة',
      CASE WHEN clean_reason IS NOT NULL THEN 'السبب: ' || clean_reason
           ELSE 'تواصل مع الإدارة لمعرفة التفاصيل.' END,
      request_link,
      jsonb_build_object('request_id', p_request_id, 'reason', clean_reason));
  END IF;
  -- closed/cancelled -> open by an admin: nothing (not a moderation decision against the parent).

  RETURN p_status;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_request_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_request_status(uuid, text, text) TO authenticated;
