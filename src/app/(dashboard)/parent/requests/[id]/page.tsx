import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import { getMyRequest } from '@/services/requests';
import { getOfferContact, getOffersOnMyRequest } from '@/services/offers';
import ContactCard from '@/components/offers/ContactCard';
import RequestCard from '@/components/requests/RequestCard';
import MyRequestActions from '@/components/requests/MyRequestActions';
import ParentOfferCard from '@/components/offers/ParentOfferCard';
import OfferDecisionActions from '@/components/offers/OfferDecisionActions';
import type { OfferStatus } from '@/types/database';

// Accepted first, then the ones waiting for an answer, then the rest.
const ORDER: Record<OfferStatus, number> = { accepted: 0, pending: 1, declined: 2, withdrawn: 3, archived: 4, removed: 5 };

export default async function MyRequestOffersPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/parent/requests/${params.id}`);

  const request = await getMyRequest(user.id, params.id);
  if (!request) notFound();

  const offers = (await getOffersOnMyRequest(request.id)).sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const pendingCount = offers.filter((o) => o.status === 'pending').length;
  const canDecide = request.status === 'open';
  const accepted = offers.find((o) => o.status === 'accepted');
  const contact = accepted ? await getOfferContact(accepted.id) : null;

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Button component={Link} href="/parent/requests" sx={{ mb: 2 }}>→ كل طلباتي</Button>
      <Box sx={{ mb: 4 }}>
        <RequestCard request={request} footer={<MyRequestActions requestId={request.id} status={request.status} />} />
      </Box>

      <Typography variant="h5" fontWeight="bold" mb={1}>العروض ({offers.length})</Typography>
      <Typography color="text.secondary" mb={3}>
        {canDecide
          ? pendingCount > 0
            ? 'قارن بين العروض واقبل الأنسب. قبول عرض يُغلق الطلب ويرفض الباقي تلقائياً.'
            : 'لم تصل عروض جديدة بعد. ستظهر هنا عندما يتقدم المتخصصون.'
          : 'هذا الطلب لم يعد مفتوحاً، فلا يمكن قبول عروض جديدة عليه.'}
      </Typography>

      {offers.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">لا توجد عروض على هذا الطلب حتى الآن.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {offers.map((offer) => (
            <ParentOfferCard
              key={offer.id}
              offer={offer}
              actions={
                offer.status === 'accepted' ? (
                  <ContactCard title="تواصل مع المتخصص لترتيب أول حصة" contact={contact} />
                ) : canDecide && offer.status === 'pending' ? (
                  <OfferDecisionActions offerId={offer.id} />
                ) : undefined
              }
            />
          ))}
        </Stack>
      )}
    </Container>
  );
}
