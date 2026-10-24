import { Container, Paper, Typography } from '@mui/material';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getRequestFormLookups } from '@/services/lookups';
import RequestForm from '@/components/requests/RequestForm';

export default async function NewRequestPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirectTo=/parent/requests/new');

  const lookups = await getRequestFormLookups();

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" component="h1" fontWeight="bold" color="primary" gutterBottom>
        انشر طلباً جديداً
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        يظهر طلبك للمتخصصين في صفحة الطلبات، ويمكنك تعديله أو إغلاقه في أي وقت.
      </Typography>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 } }}>
        <RequestForm lookups={lookups} parentId={user.id} />
      </Paper>
    </Container>
  );
}
