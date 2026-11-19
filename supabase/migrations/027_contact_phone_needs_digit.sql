-- Migration: 027_contact_phone_needs_digit.sql
-- Description: NAB-140 (bug, CodeRabbit finding on Sprint 7). submit_contact_message (026) checked
-- the phone only against '^\+?[0-9 ()-]{6,30}$', so a "phone" made purely of the allowed
-- formatting characters and at least 6 long (e.g. '------', '+ ( ) -') was accepted and stored as
-- the only reply channel -- a message nobody can answer. ('---' or '+()' already failed the
-- 6-character minimum.)
--
-- Fix: after the existing length (<= 30) and allowed-character checks, the phone must still contain
-- at least one digit once the permitted formatting characters (+, space, parentheses, hyphen) are
-- removed. Otherwise it fails with the same error key, contact_phone_invalid (23514).
--
-- Unchanged from 026: signature, every other validation and error key, the 5-per-hour spam guard,
-- the NAB-139 silence for @example.invalid test messages, SECURITY DEFINER with search_path = '',
-- and access (EXECUTE for anon + authenticated only; anyone may send a contact message, only admins
-- read them through existing RLS).

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
  IF v_phone IS NOT NULL AND (char_length(v_phone) > 30 OR v_phone !~ '^\+?[0-9 ()-]{6,30}$'
                             OR regexp_replace(v_phone, '[+ ()-]', '', 'g') !~ '[0-9]') THEN
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

  -- NAB-139: test messages (RFC 2606 reserved domain) are stored but notify nobody.
  IF v_email IS NULL OR v_email NOT LIKE '%@example.invalid' THEN
    PERFORM public.notify_admins(
      'admin.contact_message',
      'رسالة جديدة من صفحة تواصل معنا',
      v_name || COALESCE(' — ' || v_subject, ''),
      '/admin/messages',
      jsonb_build_object('contact_message_id', new_id));
  END IF;

  RETURN new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_contact_message(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_contact_message(text, text, text, text, text) TO anon, authenticated;
