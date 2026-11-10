'use client';

import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import type { NotificationItem } from '@/services/notifications';
import { formatDateTime } from '@/utils/formatDate';
import { UNREAD_BG } from './NotificationBell';
import { useNotificationActions } from './useNotificationActions';

// The full list on /notifications and /admin/notifications (NAB-107).
export default function NotificationList({ items }: { items: NotificationItem[] }) {
  const { busy, error, isUnread, open, markRead, markAll } = useNotificationActions(items);
  const anyUnread = items.some(isUnread);

  if (items.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">لا توجد إشعارات</Typography>
      </Box>
    );
  }

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="outlined" onClick={markAll} disabled={busy || !anyUnread}>
          تعليم الكل كمقروء
        </Button>
      </Box>

      <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', p: 0, m: 0 }}>
        {items.map((item) => {
          const unread = isUnread(item);
          return (
            <Paper
              key={item.id}
              component="li"
              variant="outlined"
              data-unread={unread || undefined}
              sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'flex-start', bgcolor: unread ? UNREAD_BG : 'background.paper' }}
            >
              <Box
                component="button"
                type="button"
                onClick={() => open(item)}
                disabled={busy}
                sx={{
                  flexGrow: 1, minWidth: 0, textAlign: 'start', background: 'none', border: 0, p: 0, font: 'inherit', color: 'inherit',
                  cursor: item.link || unread ? 'pointer' : 'default',
                }}
              >
                <Typography fontWeight={unread ? 'bold' : 'normal'}>{item.title}</Typography>
                {item.body && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{item.body}</Typography>}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {formatDateTime(item.createdAt)}
                </Typography>
              </Box>
              {unread && (
                <Button size="small" onClick={() => markRead(item)} disabled={busy} sx={{ flexShrink: 0 }}>
                  تعليم كمقروء
                </Button>
              )}
            </Paper>
          );
        })}
      </Stack>
    </>
  );
}
