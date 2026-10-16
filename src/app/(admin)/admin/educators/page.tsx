import { Suspense } from 'react';
import { Typography, Stack, Box } from '@mui/material';
import { getEducatorsForReview, VERIFICATION_STATUSES } from '@/services/admin';
import EducatorReviewFilters from '@/components/admin/EducatorReviewFilters';
import EducatorReviewCard from '@/components/admin/EducatorReviewCard';
import type { EducatorVerificationStatus } from '@/types/database';

export default async function AdminEducatorsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  // Default to the pending queue; "all" (or anything unknown) drops the status filter.
  const statusParam = searchParams.status ?? 'pending';
  const status = VERIFICATION_STATUSES.includes(statusParam as EducatorVerificationStatus)
    ? (statusParam as EducatorVerificationStatus)
    : undefined;

  const educators = await getEducatorsForReview({ status, q: searchParams.q });

  return (
    <>
      <Typography variant="h4" component="h1" fontWeight="bold" color="primary" gutterBottom>
        توثيق المعلمين
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        راجع بيانات المعلمين قبل ظهورهم في دليل المعلمين.
      </Typography>

      <Suspense>
        <EducatorReviewFilters />
      </Suspense>

      {educators.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">لا يوجد معلمون مطابقون.</Typography>
        </Box>
      ) : (
        <Stack spacing={3}>
          {educators.map((educator) => (
            <EducatorReviewCard key={educator.id} educator={educator} />
          ))}
        </Stack>
      )}
    </>
  );
}
