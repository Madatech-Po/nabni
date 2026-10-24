import { notFound, redirect } from 'next/navigation';
import { Container, Paper, Typography } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import { getMyRequestForEdit } from '@/services/requests';
import { getRequestFormLookups } from '@/services/lookups';
import RequestForm from '@/components/requests/RequestForm';
import { toFormValues } from '@/components/requests/requestFormValues';

export default async function EditRequestPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/parent/requests/${params.id}/edit`);

  const [request, lookups] = await Promise.all([getMyRequestForEdit(user.id, params.id), getRequestFormLookups()]);
  if (!request) notFound();

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" component="h1" fontWeight="bold" color="primary" mb={4}>
        تعديل الطلب
      </Typography>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 } }}>
        <RequestForm lookups={lookups} parentId={user.id} requestId={params.id} initialValues={toFormValues(request)} />
      </Paper>
    </Container>
  );
}
