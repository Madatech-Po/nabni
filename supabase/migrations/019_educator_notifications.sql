-- Migration: 019_educator_notifications.sql
-- Description: NAB-96 (epic NAB-105). Educators get an in-app notification (via notify(), 018)
-- when an admin decides on their verification or when one of their offers changes outcome.
--
-- How:
--   * AFTER UPDATE triggers on educators.verification_status and offers.status, so every code
--     path is covered (set_educator_verification, accept_offer and its auto-declines,
--     decline_offer, the archive_offers_when_request_closes trigger, ...). They fire only when
--     the status really changes (WHEN OLD IS DISTINCT FROM NEW), so a no-op creates nothing.
--   * Recipient = educators.user_id (a profiles.id).
--   * Verification events: pending -> verified, rejected/suspended -> verified (reactivated),
--     -> rejected, -> suspended. Nothing for -> pending (NAB-111 handles that later). The reason
--     comes from educators.verification_reason, set in the same UPDATE (017).
--   * Offer events: -> accepted, -> declined, -> archived. Nothing for -> withdrawn (the educator
--     did it themselves).
--   * -> removed is NOT handled by the trigger: the admin's reason exists only inside
--     remove_offer() (it goes to admin_logs, written after the UPDATE, so a row trigger cannot
--     see it yet). remove_offer() calls notify() itself with the reason. Clients have no UPDATE
--     grant on offers.status, so remove_offer() is the only way an offer becomes 'removed'.
--   * Trigger functions are SECURITY DEFINER (notify() is not callable by clients) and nobody
--     may call them directly.

-- ---------- Verification decisions ----------

CREATE OR REPLACE FUNCTION public.notify_educator_verification_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  reason text := NULLIF(trim(NEW.verification_reason), '');
BEGIN
  IF NEW.verification_status = 'verified' AND OLD.verification_status IN ('rejected', 'suspended') THEN
    PERFORM public.notify(
      NEW.user_id, 'educator.reactivated', 'تمت إعادة تفعيل حسابك',
      'يمكنك الآن تقديم العروض على طلبات أولياء الأمور.', '/teacher',
      jsonb_build_object('educator_id', NEW.id));

  ELSIF NEW.verification_status = 'verified' THEN
    PERFORM public.notify(
      NEW.user_id, 'educator.verified', 'تم توثيق ملفك',
      'يمكنك الآن تقديم العروض على طلبات أولياء الأمور.', '/teacher',
      jsonb_build_object('educator_id', NEW.id));

  ELSIF NEW.verification_status = 'rejected' THEN
    PERFORM public.notify(
      NEW.user_id, 'educator.rejected', 'لم يتم توثيق ملفك',
      CASE WHEN reason IS NOT NULL THEN 'سبب القرار: ' || reason
           ELSE 'راجع ملفك الشخصي لمعرفة التفاصيل أو تواصل مع الإدارة.' END,
      '/teacher/profile',
      jsonb_build_object('educator_id', NEW.id, 'reason', reason));

  ELSIF NEW.verification_status = 'suspended' THEN
    PERFORM public.notify(
      NEW.user_id, 'educator.suspended', 'تم إيقاف حسابك',
      CASE WHEN reason IS NOT NULL THEN 'سبب القرار: ' || reason
           ELSE 'تواصل مع الإدارة لمعرفة التفاصيل.' END,
      '/teacher',
      jsonb_build_object('educator_id', NEW.id, 'reason', reason));
  END IF;
  -- -> pending: nothing (NAB-111).

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_educator_verification_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_educator_on_verification_change ON public.educators;
CREATE TRIGGER notify_educator_on_verification_change
  AFTER UPDATE OF verification_status ON public.educators
  FOR EACH ROW
  WHEN (OLD.verification_status IS DISTINCT FROM NEW.verification_status)
  EXECUTE FUNCTION public.notify_educator_verification_change();

-- ---------- Offer outcomes ----------

CREATE OR REPLACE FUNCTION public.notify_educator_offer_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient uuid;
  payload jsonb := jsonb_build_object('offer_id', NEW.id, 'request_id', NEW.request_id);
BEGIN
  -- withdrawn: the educator's own action; removed: notified by remove_offer() with the reason.
  IF NEW.status NOT IN ('accepted', 'declined', 'archived') THEN
    RETURN NULL;
  END IF;

  SELECT user_id INTO recipient FROM public.educators WHERE id = NEW.educator_id;

  IF NEW.status = 'accepted' THEN
    PERFORM public.notify(recipient, 'offer.accepted', 'قبل ولي الأمر عرضك',
      'تواصل مع ولي الأمر لترتيب أول حصة.', '/teacher/offers', payload);
  ELSIF NEW.status = 'declined' THEN
    PERFORM public.notify(recipient, 'offer.declined', 'لم يتم اختيار عرضك',
      'يمكنك متابعة الطلبات المفتوحة وتقديم عروض أخرى.', '/teacher/offers', payload);
  ELSE
    PERFORM public.notify(recipient, 'offer.archived', 'أُغلق الطلب الذي قدمت عليه',
      'لم يعد الطلب يستقبل عروضًا، لذلك أُرشف عرضك.', '/teacher/offers', payload);
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_educator_offer_status_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_educator_on_offer_status_change ON public.offers;
CREATE TRIGGER notify_educator_on_offer_status_change
  AFTER UPDATE OF status ON public.offers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_educator_offer_status_change();

-- ---------- Admin removal: same as 016, plus the notification with the reason ----------

CREATE OR REPLACE FUNCTION public.remove_offer(p_offer_id uuid, p_reason text DEFAULT NULL)
RETURNS public.offer_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  o public.offers%ROWTYPE;
  clean_reason text := NULLIF(trim(p_reason), '');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can remove offers' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO o FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer % not found', p_offer_id USING ERRCODE = 'no_data_found';
  END IF;
  IF o.status = 'removed' THEN
    RETURN 'removed';
  END IF;
  IF o.status NOT IN ('pending', 'accepted') THEN
    RAISE EXCEPTION 'Only pending or accepted offers can be removed' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.offers SET status = 'removed' WHERE id = p_offer_id;

  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'offer.removed',
    'offer',
    p_offer_id,
    jsonb_build_object('from', o.status, 'to', 'removed', 'reason', clean_reason)
  );

  PERFORM public.notify(
    (SELECT user_id FROM public.educators WHERE id = o.educator_id),
    'offer.removed',
    'تمت إزالة عرضك من قِبل الإدارة',
    CASE WHEN clean_reason IS NOT NULL THEN 'سبب الإزالة: ' || clean_reason
         ELSE 'تواصل مع الإدارة لمعرفة التفاصيل.' END,
    '/teacher/offers',
    jsonb_build_object('offer_id', p_offer_id, 'request_id', o.request_id, 'reason', clean_reason)
  );

  RETURN 'removed';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.remove_offer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_offer(uuid, text) TO authenticated;
