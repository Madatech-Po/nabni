import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Box, Button, Container, Grid, Paper, Typography } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import { getMyRequests } from '@/services/requests';
import RequestCard from '@/components/requests/RequestCard';
import MyRequestActions from '@/components/requests/MyRequestActions';
import { countByStatus } from '@/components/requests/countByStatus';

const LATEST = 2;

export default async function ParentDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, onboarding_completed')
    .eq('id', user.id)
    .single();

  if (!profile?.onboarding_completed) redirect('/parent/profile');

  const requests = await getMyRequests(user.id);
  const counts = countByStatus(requests);
  const stats = [
    { label: 'طلبات مفتوحة', value: counts.open, color: 'success.main' },
    { label: 'طلبات مغلقة', value: counts.closed + counts.cancelled, color: 'text.secondary' },
    { label: 'إجمالي الطلبات', value: requests.length, color: 'primary.main' },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
          أهلاً{profile.full_name ? ` ${profile.full_name}` : ''}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button component={Link} href="/parent/requests/new" variant="contained">انشر طلباً جديداً</Button>
          <Button component={Link} href="/parent/requests" variant="outlined">كل طلباتي</Button>
        </Box>
      </Box>

      <Grid container spacing={2} mb={5}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={4} key={stat.label}>
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h3" fontWeight="bold" sx={{ color: stat.color }}>{stat.value}</Typography>
              <Typography color="text.secondary">{stat.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" fontWeight="bold" mb={2}>أحدث طلباتك</Typography>
      {requests.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" mb={2}>
            لم تنشر أي طلبات بعد. انشر طلباً يوضح احتياجات طفلك وسيظهر للمتخصصين.
          </Typography>
          <Button component={Link} href="/parent/requests/new" variant="contained">انشر أول طلب</Button>
        </Paper>
      ) : (
        <Grid container spacing={4}>
          {requests.slice(0, LATEST).map((request) => (
            <Grid item xs={12} md={6} key={request.id}>
              <RequestCard request={request} footer={<MyRequestActions requestId={request.id} status={request.status} />} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
