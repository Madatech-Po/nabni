import { getMyNotifications, getMyUnreadCount, type NotificationItem } from '@/services/notifications';

export const BELL_LIMIT = 5;

export interface HeaderNotifications {
  unreadCount: number;
  items: NotificationItem[];
}

/**
 * What the header bell shows, read on the server for the signed-in user (NAB-107). A failed read
 * shows an empty bell rather than breaking every page that has the header.
 */
export async function getHeaderNotifications(): Promise<HeaderNotifications> {
  try {
    const [unreadCount, items] = await Promise.all([getMyUnreadCount(), getMyNotifications({ limit: BELL_LIMIT })]);
    return { unreadCount, items };
  } catch {
    return { unreadCount: 0, items: [] };
  }
}
