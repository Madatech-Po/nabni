'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Alert, Badge, Box, Button, Divider, IconButton, List, ListItemButton, ListItemText, Popover, Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/NotificationsNoneOutlined';
import type { NotificationItem } from '@/services/notifications';
import { formatDateTime } from '@/utils/formatDate';
import { useNotificationActions } from './useNotificationActions';

export const UNREAD_BG = 'rgba(13, 148, 136, 0.08)'; // the primary teal, faint

export interface NotificationBellProps {
  /** All the user's unread notifications, not just the ones in `items`. */
  unreadCount: number;
  /** The latest few, newest first (server-fetched). */
  items: NotificationItem[];
  /** The full list: /notifications, or /admin/notifications in the admin area. */
  viewAllHref: string;
  /** Light icon for the admin's dark header. */
  onDark?: boolean;
}

// The header bell with the unread count and the latest notifications (NAB-107).
export default function NotificationBell({ unreadCount, items, viewAllHref, onDark = false }: NotificationBellProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { busy, error, allRead, isUnread, open, markAll } = useNotificationActions(items);

  const readHere = items.filter((item) => !item.readAt && !isUnread(item)).length;
  const count = allRead ? 0 : Math.max(0, unreadCount - readHere);
  const close = () => setAnchor(null);

  async function pick(item: NotificationItem) {
    if (await open(item)) close();
  }

  return (
    <>
      <IconButton
        aria-label="الإشعارات"
        aria-haspopup="dialog"
        aria-expanded={Boolean(anchor)}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ color: onDark ? 'inherit' : 'text.primary' }}
      >
        <Badge badgeContent={count} color={onDark ? 'secondary' : 'error'} max={99} invisible={count === 0}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { role: 'dialog', 'aria-label': 'آخر الإشعارات', sx: { width: 340, maxWidth: 'calc(100vw - 32px)' } } }}
      >
        <Typography variant="subtitle1" fontWeight="bold" sx={{ px: 2, pt: 1.5, pb: 1 }}>
          الإشعارات
        </Typography>
        <Divider />
        {error && <Alert severity="error" sx={{ m: 1 }}>{error}</Alert>}

        {items.length === 0 ? (
          <Typography color="text.secondary" sx={{ px: 2, py: 3, textAlign: 'center' }}>
            لا توجد إشعارات
          </Typography>
        ) : (
          <List dense disablePadding>
            {items.map((item) => {
              const unread = isUnread(item);
              return (
                <ListItemButton
                  key={item.id}
                  data-unread={unread || undefined}
                  disabled={busy}
                  onClick={() => pick(item)}
                  sx={{ alignItems: 'flex-start', bgcolor: unread ? UNREAD_BG : 'transparent' }}
                >
                  <ListItemText
                    primary={item.title}
                    secondary={
                      <>
                        {item.body && <Box component="span" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.body}</Box>}
                        <Box component="span" sx={{ display: 'block', fontSize: '0.75rem' }}>{formatDateTime(item.createdAt)}</Box>
                      </>
                    }
                    primaryTypographyProps={{ fontWeight: unread ? 'bold' : 'normal' }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}

        <Divider />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, p: 1 }}>
          <Button size="small" onClick={markAll} disabled={busy || count === 0}>
            تعليم الكل كمقروء
          </Button>
          <Button size="small" component={Link} href={viewAllHref} onClick={close}>
            عرض الكل
          </Button>
        </Box>
      </Popover>
    </>
  );
}
