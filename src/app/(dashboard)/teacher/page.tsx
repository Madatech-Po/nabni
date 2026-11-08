import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Box, Button, Chip, Container, Grid, Paper, Typography } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import { getEducatorOfferingState, getMatchingOpenRequests, getMyOffers, getRequestIdsWithMyActiveOffer } from '@/services/offers';
import RequestCard from '@/components/requests/RequestCard';
import OfferButton from '@/components/offers/OfferButton';
import CannotOfferNotice from '@/components/offers/CannotOfferNotice';
import { STATUS_COLORS, STATUS_LABELS } from '@/components/admin/verificationStatus';

export default async function TeacherDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, onboarding_completed')
    .eq('id', user.id)
    .single();

  if (!profile?.onboarding_completed) redirect('/teacher/profile');

  const educator = await getEducatorOfferingState(user.id);
  const [offers, matching, offered] = educator
    ? await Promise.all([
        getMyOffers(educator.educatorId),
        educator.canOffer ? getMatchingOpenRequests(educator.educatorId) : Promise.resolve([]),
        getRequestIdsWithMyActiveOffer(educator.educatorId),
      ])
    : [[], [], new Set<string>()];

  const stats = [
    { label: 'عروض بانتظار الرد', value: offers.filter((o) => o.status === 'pending').length, color: 'warning.main' },
    { label: 'عروض مقبولة', value: offers.filter((o) => o.status === 'accepted').length, color: 'success.main' },
    { label: 'إجمالي عروضك', value: offers.length, color: 'primary.main' },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
            أهلاً{profile.full_name ? ` ${profile.full_name}` : ''}
          </Typography>
          {educator?.verificationStatus && (
            <Chip
              size="small"
              sx={{ mt: 1 }}
              label={`حالة الملف: ${STATUS_LABELS[educator.verificationStatus]}`}
              color={STATUS_COLORS[educator.verificationStatus]}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button component={Link} href="/requests" variant="contained">تصفح الطلبات</Button>
          <Button component={Link} href="/teacher/offers" variant="outlined">عروضي</Button>
          <Button component={Link} href="/teacher/profile" variant="text">ملفي</Button>
        </Box>
      </Box>

      {!educator && <CannotOfferNotice reason="no_profile" />}
      {educator && !educator.canOffer && (
        <Box sx={{ mb: 4 }}>
          <CannotOfferNotice
            reason={educator.verificationStatus === 'verified' ? 'inactive' : educator.verificationStatus ?? 'pending'}
            note={educator.verificationReason}
          />
        </Box>
      )}

      {educator && (
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
      )}

      {educator?.canOffer && (
        <>
          <Typography variant="h6" fontWeight="bold" mb={2}>طلبات تناسب خدماتك ومنطقتك</Typography>
          {matching.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" mb={2}>لا توجد طلبات مطابقة الآن. تصفح كل الطلبات أو حدّث خدماتك ومناطقك.</Typography>
              <Button component={Link} href="/requests" variant="contained">كل الطلبات</Button>
            </Paper>
          ) : (
            <Grid container spacing={4}>
              {matching.map((request) => (
                <Grid item xs={12} md={4} key={request.id}>
                  <RequestCard
                    request={request}
                    footer={<OfferButton requestId={request.id} alreadyOffered={offered.has(request.id)} />}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Container>
  );
}
