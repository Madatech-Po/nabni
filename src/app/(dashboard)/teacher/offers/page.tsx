import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Box, Button, Chip, Container, Paper, Stack, Typography } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import { getEducatorOfferingState, getMyOffers } from '@/services/offers';
import MyOfferActions from '@/components/offers/MyOfferActions';
import CannotOfferNotice from '@/components/offers/CannotOfferNotice';
import { MY_OFFER_STATUS_LABELS, OFFER_STATUS_COLORS } from '@/components/offers/offerStatus';
import { formatDate } from '@/utils/formatDate';

export default async function MyOffersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirectTo=/teacher/offers');

  const educator = await getEducatorOfferingState(user.id);
  const offers = educator ? await getMyOffers(educator.educatorId) : [];
  // Offers that ended while the request stayed open can be replaced by a new one.
  const activeRequestIds = new Set(
    offers.filter((o) => o.status === 'pending' || o.status === 'accepted').map((o) => o.request?.id)
  );

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" color="primary">عروضي</Typography>
        <Button component={Link} href="/requests" variant="contained">تصفح الطلبات</Button>
      </Box>

      {!educator && <CannotOfferNotice reason="no_profile" />}

      {educator && offers.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" mb={2}>لم تقدّم أي عروض بعد.</Typography>
          <Button component={Link} href="/requests" variant="contained">تصفح طلبات أولياء الأمور</Button>
        </Paper>
      )}

      <Stack spacing={2}>
        {offers.map((offer) => {
          const request = offer.request;
          const canOfferAgain =
            educator?.canOffer && request?.status === 'open' && !activeRequestIds.has(request.id);
          return (
            <Paper key={offer.id} variant="outlined" sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1.5 }}>
                <Chip size="small" label={MY_OFFER_STATUS_LABELS[offer.status]} color={OFFER_STATUS_COLORS[offer.status]} />
                {request?.service_category && <Chip size="small" variant="outlined" label={request.service_category.name_ar} />}
                {request?.governorate && (
                  <Chip size="small" variant="outlined" label={[request.governorate.name_ar, request.area].filter(Boolean).join(' - ')} />
                )}
                <Typography variant="body2" color="text.secondary" sx={{ ms: 'auto', marginInlineStart: 'auto' }}>
                  {formatDate(offer.created_at)}
                </Typography>
              </Box>

              {request && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  طلب لطفل {request.student_age} سنوات: {request.description}
                </Typography>
              )}

              <Typography fontWeight="bold">
                {offer.price} ج.م{offer.pricing_unit ? ` / ${offer.pricing_unit.name_ar}` : ''}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>المواعيد: {offer.schedule}</Typography>
              {offer.start_date && <Typography variant="body2">البدء: {formatDate(offer.start_date)}</Typography>}
              {offer.notes && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-line' }}>{offer.notes}</Typography>
              )}

              <Box sx={{ mt: 2 }}>
                {offer.status === 'pending' && <MyOfferActions offerId={offer.id} />}
                {canOfferAgain && request && (
                  <Button component={Link} href={`/teacher/requests/${request.id}/offer`} size="small" variant="outlined">
                    قدّم عرضاً جديداً على هذا الطلب
                  </Button>
                )}
              </Box>
            </Paper>
          );
        })}
      </Stack>
    </Container>
  );
}
