import { Container, Typography, Grid, Box } from '@mui/material';
import Image from 'next/image';
import { parsePositiveIntId } from '@/utils/searchParams';
import { getOpenRequests } from '@/services/requests';
import RequestFilters from '@/components/requests/RequestFilters';
import RequestCard from '@/components/requests/RequestCard';

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: { subject?: string; governorate?: string };
}) {
  const requests = await getOpenRequests({
    serviceCategoryId: parsePositiveIntId(searchParams.subject),
    governorateId: parsePositiveIntId(searchParams.governorate),
  });

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom color="primary" fontWeight="bold">
        طلبات أولياء الأمور
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        استعرض الطلبات المفتوحة من أولياء الأمور وقدم عرضك بعد تسجيل الدخول كمتخصص.
      </Typography>

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
              <RequestCard request={request} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
