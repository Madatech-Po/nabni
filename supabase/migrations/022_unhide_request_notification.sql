-- Migration: 022_unhide_request_notification.sql
-- Description: NAB-118. The admin's "إلغاء الإخفاء" button moves a hidden request
-- removed -> closed (a deliberate moderation choice, unchanged). 020 sent request.restored only
-- for removed -> open, so un-hiding to closed told the parent "تم إغلاق طلبك من قِبل الإدارة"
-- (request.closed_by_admin), which is misleading.
--
-- Now, inside set_request_status() (admins only):
--   * any move OUT of 'removed' is an un-hide -> request.restored:
--       - removed -> open      : "تمت إعادة نشر طلبك" (as in 020)
--       - removed -> closed    : "تم إلغاء إخفاء طلبك" + "you can reopen it from the request page"
--       - removed -> cancelled : "تم إلغاء إخفاء طلبك" + "it is cancelled"
--     data gains the new status.
--   * request.closed_by_admin only for a non-removed request -> closed / cancelled.
--   * Everything else (signature, admin check, validation, no-op, admin_logs entry, grants,
--     -> removed notification) is exactly as in 020.

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
  ELSIF old_status = 'removed' THEN
    -- Any move out of 'removed' is an un-hide, never a new decision against the parent.
    PERFORM public.notify(
      owner_id, 'request.restored',
      CASE WHEN p_status = 'open' THEN 'تمت إعادة نشر طلبك' ELSE 'تم إلغاء إخفاء طلبك' END,
      CASE p_status
        WHEN 'open'   THEN 'طلبك ظاهر من جديد ويستقبل العروض.'
        WHEN 'closed' THEN 'طلبك ظاهر لك الآن لكنه مغلق، ويمكنك إعادة فتحه من صفحة الطلب.'
        ELSE 'طلبك ظاهر لك الآن لكنه ملغى.'
      END,
      request_link,
      jsonb_build_object('request_id', p_request_id, 'status', p_status));
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
