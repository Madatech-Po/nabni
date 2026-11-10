import { createClient } from '@/utils/supabase/client';

// Marking the user's own notifications read, from the browser (NAB-106). Clients can't update
// the table directly; the RPCs only touch the caller's rows.

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await createClient().rpc('mark_notification_read', { p_id: id });
  if (error) throw error;
}

/** Marks every unread notification read and returns how many were marked. */
export async function markAllNotificationsRead(): Promise<number> {
  const { data, error } = await createClient().rpc('mark_all_notifications_read');
  if (error) throw error;
  return data ?? 0;
}
