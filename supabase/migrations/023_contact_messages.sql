-- Migration: 023_contact_messages.sql
-- Description: NAB-124 (Sprint 7, pilot launch). Messages sent from the "تواصل معنا" page are
-- stored in contact_messages and every active admin gets an in-app notification.
--
-- Fields: the /contact page is still a placeholder (no form yet), so the columns follow the
-- NAB-124 brief: name, email, phone, subject, message. At least one of email / phone is
-- required so the team can answer.
--
-- Access rules:
--   * Nobody writes the table directly (no INSERT/UPDATE/DELETE grants or policies).
--   * submit_contact_message(...) is the only way in: callable by anon and authenticated
--     (inactive / suspended accounts included, so they can still reach support). It trims
--     and validates every field, sets sender_id = auth.uid() when signed in, applies a simple
--     spam guard and notifies every active admin (notify_admins, 021) with
--     type 'admin.contact_message' -> /admin/messages.
--   * Spam guard: at most 5 messages per hour from the same signed-in sender, the same
--     email (case-insensitive) or the same phone. The 6th raises SQLSTATE 'PT429' with the
--     message 'contact_rate_limited' (PostgREST answers HTTP 429 for 'PT429').
--     It does not stop an anonymous sender who changes email/phone each time; enough for
--     the pilot.
--   * Validation errors raise SQLSTATE 'check_violation' (23514) with a stable message key:
--     contact_name_invalid, contact_email_invalid, contact_phone_invalid,
--     contact_subject_invalid, contact_message_invalid, contact_reply_channel_required.
--   * SELECT: active admins only (is_admin()).
--   * mark_contact_message_handled(p_id): admins only; sets handled_at / handled_by once and
--     logs 'contact_message.handled' in admin_logs. Calling it again on a handled message
--     returns the original handled_at and logs nothing.

-- ---------- Table ----------

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  email text CHECK (email IS NULL OR char_length(email) BETWEEN 3 AND 200),
  phone text CHECK (phone IS NULL OR char_length(phone) BETWEEN 1 AND 30),
  subject text CHECK (subject IS NULL OR char_length(subject) BETWEEN 1 AND 150),
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  handled_at timestamptz,
  handled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_messages_reply_channel CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

COMMENT ON TABLE public.contact_messages IS
  'Messages from the contact page (NAB-124). Written only by submit_contact_message(); read by admins.';

CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON public.contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_unhandled
  ON public.contact_messages (created_at DESC) WHERE handled_at IS NULL;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.contact_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.contact_messages TO authenticated;

DROP POLICY IF EXISTS "Admins can read contact messages" ON public.contact_messages;
CREATE POLICY "Admins can read contact messages"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (public.is_admin());

-- ---------- Submit ----------

CREATE OR REPLACE FUNCTION public.submit_contact_message(
  p_name text,
  p_email text,
  p_phone text,
  p_subject text,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name    text := NULLIF(trim(p_name), '');
  v_email   text := lower(NULLIF(trim(p_email), ''));
  v_phone   text := NULLIF(trim(p_phone), '');
  v_subject text := NULLIF(trim(p_subject), '');
  v_message text := NULLIF(trim(p_message), '');
  v_sender  uuid := auth.uid();
  recent    integer;
  new_id    uuid;
BEGIN
  IF v_name IS NULL OR char_length(v_name) > 100 THEN
    RAISE EXCEPTION 'contact_name_invalid' USING ERRCODE = 'check_violation';
  END IF;
  IF v_email IS NOT NULL
     AND (char_length(v_email) > 200 OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') THEN
    RAISE EXCEPTION 'contact_email_invalid' USING ERRCODE = 'check_violation';
  END IF;
  IF v_phone IS NOT NULL AND (char_length(v_phone) > 30 OR v_phone !~ '^\+?[0-9 ()-]{6,30}$') THEN
    RAISE EXCEPTION 'contact_phone_invalid' USING ERRCODE = 'check_violation';
  END IF;
  IF v_email IS NULL AND v_phone IS NULL THEN
    RAISE EXCEPTION 'contact_reply_channel_required' USING ERRCODE = 'check_violation';
  END IF;
  IF v_subject IS NOT NULL AND char_length(v_subject) > 150 THEN
    RAISE EXCEPTION 'contact_subject_invalid' USING ERRCODE = 'check_violation';
  END IF;
  IF v_message IS NULL OR char_length(v_message) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'contact_message_invalid' USING ERRCODE = 'check_violation';
  END IF;

  -- Spam guard: 5 per hour per signed-in sender, email or phone.
  SELECT count(*) INTO recent
  FROM public.contact_messages
  WHERE created_at > now() - interval '1 hour'
    AND (   (v_sender IS NOT NULL AND sender_id = v_sender)
         OR (v_email IS NOT NULL AND email = v_email)
         OR (v_phone IS NOT NULL AND phone = v_phone));
  IF recent >= 5 THEN
    RAISE EXCEPTION 'contact_rate_limited' USING ERRCODE = 'PT429';
  END IF;

  INSERT INTO public.contact_messages (name, email, phone, subject, message, sender_id)
  VALUES (v_name, v_email, v_phone, v_subject, v_message, v_sender)
  RETURNING id INTO new_id;

  PERFORM public.notify_admins(
    'admin.contact_message',
    'رسالة جديدة من صفحة تواصل معنا',
    v_name || COALESCE(' — ' || v_subject, ''),
    '/admin/messages',
    jsonb_build_object('contact_message_id', new_id));

  RETURN new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_contact_message(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_contact_message(text, text, text, text, text) TO anon, authenticated;

-- ---------- Admin: mark handled ----------

CREATE OR REPLACE FUNCTION public.mark_contact_message_handled(p_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  old_handled timestamptz;
  new_handled timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can handle contact messages'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT handled_at INTO old_handled
  FROM public.contact_messages
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact message % not found', p_id USING ERRCODE = 'no_data_found';
  END IF;

  IF old_handled IS NOT NULL THEN
    RETURN old_handled;
  END IF;

  UPDATE public.contact_messages
  SET handled_at = now(), handled_by = auth.uid()
  WHERE id = p_id
  RETURNING handled_at INTO new_handled;

  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'contact_message.handled', 'contact_message', p_id, '{}'::jsonb);

  RETURN new_handled;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_contact_message_handled(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_contact_message_handled(uuid) TO authenticated;
