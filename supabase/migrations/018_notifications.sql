-- Migration: 018_notifications.sql
-- Description: NAB-106 (epic NAB-105). Data model for in-app notifications. Later stories add
-- the triggers that call notify() for educator / parent / admin events, and the bell UI.
--
-- Access rules:
--   * A user reads only their own notifications. This deliberately does NOT require an active
--     profile: a suspended account must still be able to read why it was suspended.
--   * Nobody writes the table directly (no INSERT/UPDATE/DELETE policies, and those privileges
--     are revoked), like admin_logs (011). Rows are created only by notify(), which only other
--     SECURITY DEFINER functions / triggers (running as the owner) may call.
--   * The only change a user can make is marking their own rows read, through
--     mark_notification_read() / mark_all_notifications_read().
--   * Not added to the realtime publication yet (NAB-107 decides).

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS
  'In-app notifications. Readable only by the recipient; written only by notify() (NAB-106).';

-- The bell / notifications page: newest first for one user.
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications (recipient_id, created_at DESC);
-- Unread badge count.
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications (recipient_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own notifications" ON public.notifications;
CREATE POLICY "Users read their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

REVOKE ALL ON public.notifications FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.notifications FROM authenticated;
GRANT SELECT ON public.notifications TO authenticated;

-- Internal: create one notification. Returns its id, or NULL when there is no recipient
-- (so triggers can call it unconditionally for optional recipients).
CREATE OR REPLACE FUNCTION public.notify(
  p_recipient uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF p_recipient IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (recipient_id, type, title, body, link, data)
  VALUES (p_recipient, p_type, p_title, p_body, p_link, COALESCE(p_data, '{}'::jsonb))
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify(uuid, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Mark one of the caller's notifications read. Someone else's id, an unknown id or an
-- already-read row is a silent no-op.
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.notifications
  SET read_at = now()
  WHERE id = p_id
    AND recipient_id = auth.uid()
    AND read_at IS NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;

-- Mark all of the caller's unread notifications read; returns how many changed.
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.notifications
  SET read_at = now()
  WHERE recipient_id = auth.uid()
    AND read_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
