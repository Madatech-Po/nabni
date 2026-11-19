import { Box, Container, Typography, Grid, Button } from '@mui/material';
import Link from 'next/link';
import RequestCard from '@/components/requests/RequestCard';
import type { RequestFeedItem } from '@/services/requests';

/** How many of the newest open requests the home page shows. */
export const LATEST_REQUESTS_COUNT = 6;

// The newest real open requests (NAB-123), fetched by the home page on the server. With none
// open the section is hidden rather than filled with examples.
export default function LatestRequests({ requests }: { requests: RequestFeedItem[] }) {
  if (requests.length === 0) return null;

  return (
    <Box component="section" aria-label="أحدث الطلبات" sx={{ py: 10, bgcolor: 'common.white' }}>
      <Container maxWidth="lg">
        {/* Section Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 6, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h3" color="primary" fontWeight="bold" gutterBottom>
              يبحث أولياء الأمور الآن عن...
            </Typography>
            <Typography variant="h6" color="text.secondary">
              استعرض أحدث الطلبات المنشورة. إذا كنت متخصصًا مناسبًا يمكنك تقديم عرض بعد إنشاء حساب.
            </Typography>
          </Box>
          <Button component={Link} href="/requests" variant="outlined" size="large" sx={{ borderRadius: 8 }}>
            عرض جميع الطلبات
          </Button>
        </Box>

        <Grid container spacing={4}>
          {requests.slice(0, LATEST_REQUESTS_COUNT).map((request) => (
            <Grid item xs={12} sm={6} md={4} key={request.id}>
              <RequestCard request={request} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
