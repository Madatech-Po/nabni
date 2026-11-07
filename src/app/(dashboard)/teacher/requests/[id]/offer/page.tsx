import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Alert, Box, Button, Container, Paper, Typography } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import { getOpenRequest } from '@/services/requests';
import { getEducatorOfferingState, getRequestIdsWithMyActiveOffer } from '@/services/offers';
import { getPricingUnits } from '@/services/lookups';
import RequestCard from '@/components/requests/RequestCard';
import OfferForm from '@/components/offers/OfferForm';
import CannotOfferNotice from '@/components/offers/CannotOfferNotice';

export default async function SendOfferPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/teacher/requests/${params.id}/offer`);

  const [request, educator] = await Promise.all([getOpenRequest(params.id), getEducatorOfferingState(user.id)]);
  if (!request) notFound();

  let content: React.ReactNode;
  if (!educator) {
    content = <CannotOfferNotice reason="no_profile" />;
  } else if (!educator.canOffer) {
    content = <CannotOfferNotice reason={educator.verificationStatus === 'verified' ? 'inactive' : educator.verificationStatus ?? 'pending'} />;
  } else if ((await getRequestIdsWithMyActiveOffer(educator.educatorId)).has(request.id)) {
    content = (
      <Alert severity="success" variant="outlined">
        لديك عرض قائم على هذا الطلب. يمكنك تعديله أو سحبه من صفحة عروضي.
        <Button component={Link} href="/teacher/offers" size="small" variant="contained" sx={{ display: 'block', width: 'fit-content', mt: 2 }}>
          عروضي
        </Button>
      </Alert>
    );
  } else {
    const pricingUnits = await getPricingUnits();
    content = (
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 } }}>
        <OfferForm requestId={request.id} educatorId={educator.educatorId} pricingUnits={pricingUnits} />
      </Paper>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" component="h1" fontWeight="bold" color="primary" gutterBottom>
        قدّم عرضك
      </Typography>
      <Box sx={{ mb: 4 }}>
        <RequestCard request={request} />
      </Box>
      {content}
    </Container>
  );
}
