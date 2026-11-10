import { redirect } from 'next/navigation';
import { Container, Typography } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import { getMyNotifications, NOTIFICATIONS_DEFAULT_LIMIT } from '@/services/notifications';
import NotificationList from '@/components/notifications/NotificationList';

// Every signed-in user's notifications (NAB-107); admins have theirs under /admin/notifications.
export default async function NotificationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirectTo=/notifications');

  const items = await getMyNotifications({ limit: NOTIFICATIONS_DEFAULT_LIMIT });

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" component="h1" fontWeight="bold" color="primary" mb={3}>
        الإشعارات
      </Typography>
      <NotificationList items={items} />
    </Container>
  );
}
