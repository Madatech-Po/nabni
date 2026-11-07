import { Container, Typography, Grid, Box, Button } from '@mui/material';
import Link from 'next/link';
import Image from 'next/image';
import { parsePositiveIntId } from '@/utils/searchParams';
import { getOpenRequests } from '@/services/requests';
import RequestFilters from '@/components/requests/RequestFilters';
import RequestCard from '@/components/requests/RequestCard';
import OfferButton from '@/components/offers/OfferButton';
import { createClient } from '@/utils/supabase/server';
import { getEducatorOfferingState, getRequestIdsWithMyActiveOffer } from '@/services/offers';

// Signed-in educators get an offer button on each card; everyone else sees the plain feed.
async function getViewerOffers(): Promise<{ isEducator: boolean; offered: Set<string> }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isEducator: false, offered: new Set() };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'educator') return { isEducator: false, offered: new Set() };

  // The buttons are an extra: if the lookup fails, keep the feed and assume no offers yet
  // (the offer page checks again before showing the form).
  try {
    const educator = await getEducatorOfferingState(user.id);
    return {
      isEducator: true,
      offered: educator ? await getRequestIdsWithMyActiveOffer(educator.educatorId) : new Set(),
    };
  } catch {
    return { isEducator: true, offered: new Set() };
  }
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: { subject?: string; governorate?: string };
}) {
  const [requests, viewer] = await Promise.all([
    getOpenRequests({
      serviceCategoryId: parsePositiveIntId(searchParams.subject),
      governorateId: parsePositiveIntId(searchParams.governorate),
    }),
    getViewerOffers(),
  ]);

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom color="primary" fontWeight="bold">
        طلبات أولياء الأمور
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', mb: 4 }}>
        <Typography variant="body1" color="text.secondary">
          استعرض الطلبات المفتوحة من أولياء الأمور وقدم عرضك بعد تسجيل الدخول كمتخصص.
        </Typography>
        {!viewer.isEducator && (
          <Button component={Link} href="/parent/requests/new" variant="contained">
            ولي أمر؟ انشر طلبك
          </Button>
        )}
      </Box>

      <RequestFilters />

      {requests.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Box sx={{ position: 'relative', height: 200, mb: 4 }}>
            <Image src="/images/empty_requests.jpg" alt="لا توجد طلبات" fill style={{ objectFit: 'contain' }} />
          </Box>
          <Typography variant="h6" color="text.secondary">
            لا توجد طلبات مطابقة حالياً.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={4}>
          {requests.map((request) => (
            <Grid item xs={12} sm={6} md={4} key={request.id}>
              <RequestCard
                request={request}
                footer={
                  viewer.isEducator ? (
                    <OfferButton requestId={request.id} alreadyOffered={viewer.offered.has(request.id)} />
                  ) : undefined
                }
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
