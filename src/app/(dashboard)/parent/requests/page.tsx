import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Box, Button, Container, Grid, Typography } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import { getMyRequests } from '@/services/requests';
import RequestCard from '@/components/requests/RequestCard';
import MyRequestActions from '@/components/requests/MyRequestActions';

export default async function MyRequestsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirectTo=/parent/requests');

  const requests = await getMyRequests(user.id);

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
          طلباتي
        </Typography>
        <Button component={Link} href="/parent/requests/new" variant="contained">
          انشر طلباً جديداً
        </Button>
      </Box>

      {requests.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            لم تنشر أي طلبات بعد.
          </Typography>
          <Typography color="text.secondary">
            انشر طلباً يوضح احتياجات طفلك، وسيظهر للمتخصصين في صفحة الطلبات.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={4}>
          {requests.map((request) => (
            <Grid item xs={12} md={6} key={request.id}>
              <RequestCard
                request={request}
                footer={<MyRequestActions requestId={request.id} status={request.status} />}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
