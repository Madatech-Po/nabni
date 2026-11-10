'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { markAllNotificationsRead, markNotificationRead } from '@/services/myNotifications';
import type { NotificationItem } from '@/services/notifications';

export const MARK_ERROR = 'تعذر تحديث الإشعارات، حاول مرة أخرى';

/** Only in-app paths are followed ("/x", not "//host" or "https://..."). */
export function internalLink(link: string | null): string | null {
  return link && /^\/(?![/\\])/.test(link) ? link : null;
}

// Shared by the header bell and the notifications pages (NAB-107). The server data is refreshed
// after each change; `readIds` / `allRead` show the change straight away until it arrives.
/** `serverItems` is the list from the server: when a refresh brings a new one, it is trusted again. */
export function useNotificationActions(serverItems: NotificationItem[]) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [allRead, setAllRead] = useState(false);

  useEffect(() => {
    setReadIds(new Set());
    setAllRead(false);
  }, [serverItems]);

  const isUnread = (item: NotificationItem) => !item.readAt && !allRead && !readIds.has(item.id);

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch {
      setError(MARK_ERROR);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function markRead(item: NotificationItem): Promise<boolean> {
    const ok = await run(() => markNotificationRead(item.id));
    if (ok) {
      setReadIds((ids) => new Set(ids).add(item.id));
      router.refresh();
    }
    return ok;
  }

  /** Marks the item read (when unread), then follows its link if it has one. */
  async function open(item: NotificationItem): Promise<boolean> {
    if (isUnread(item) && !(await markRead(item))) return false;
    const link = internalLink(item.link);
    if (link) router.push(link);
    return true;
  }

  async function markAll(): Promise<boolean> {
    const ok = await run(() => markAllNotificationsRead());
    if (ok) {
      setAllRead(true);
      router.refresh();
    }
    return ok;
  }

  return { busy, error, allRead, isUnread, open, markRead, markAll };
}
