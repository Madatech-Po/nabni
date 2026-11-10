import { Typography } from '@mui/material';
import { getMyNotifications, NOTIFICATIONS_DEFAULT_LIMIT } from '@/services/notifications';
import NotificationList from '@/components/notifications/NotificationList';

// The admin's own notifications (NAB-107). The admin layout already checks the role.
export default async function AdminNotificationsPage() {
  const items = await getMyNotifications({ limit: NOTIFICATIONS_DEFAULT_LIMIT });

  return (
    <>
      <Typography variant="h4" component="h1" fontWeight="bold" color="primary" mb={3}>
        الإشعارات
      </Typography>
      <NotificationList items={items} />
    </>
  );
}
