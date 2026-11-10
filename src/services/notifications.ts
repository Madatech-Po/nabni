import { createClient } from '@/utils/supabase/server';

// The signed-in user's in-app notifications, read on the server (NAB-106). RLS only returns the
// user's own rows, so no recipient filter is needed; rows are written only by notify() in the DB.

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export const NOTIFICATIONS_DEFAULT_LIMIT = 50;

export interface MyNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
}

/** The user's notifications, newest first. */
export async function getMyNotifications({
  limit = NOTIFICATIONS_DEFAULT_LIMIT,
  unreadOnly = false,
}: MyNotificationsOptions = {}): Promise<NotificationItem[]> {
  const supabase = createClient();
  let query = supabase
    .from('notifications')
    .select('id, type, title, body, link, data, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (unreadOnly) query = query.is('read_at', null);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    data: row.data ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

/** How many of the user's notifications are unread, without fetching them. */
export async function getMyUnreadCount(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}
