import { notFound, redirect } from 'next/navigation';
import { Container, Paper, Typography } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import { getEducatorOfferingState, getMyPendingOffer } from '@/services/offers';
import { getPricingUnits } from '@/services/lookups';
import OfferForm from '@/components/offers/OfferForm';
import { toOfferFormValues } from '@/components/offers/offerFormValues';

export default async function EditOfferPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/teacher/offers/${params.id}/edit`);

  const educator = await getEducatorOfferingState(user.id);
  const offer = educator?.canOffer ? await getMyPendingOffer(educator.educatorId, params.id) : null;
  // Only pending offers on open requests can still change; the database enforces it too.
  if (!educator || !offer || offer.request?.status !== 'open') notFound();

  const pricingUnits = await getPricingUnits();

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" component="h1" fontWeight="bold" color="primary" mb={4}>تعديل العرض</Typography>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 } }}>
        <OfferForm
          requestId={offer.request.id}
          educatorId={educator.educatorId}
          pricingUnits={pricingUnits}
          offerId={offer.id}
          initialValues={toOfferFormValues(offer)}
        />
      </Paper>
    </Container>
  );
}
