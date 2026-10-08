import { Container, Typography, Grid, Box } from '@mui/material';
import Image from 'next/image';
import { parsePositiveIntId } from '@/utils/searchParams';
import { getTutors } from '@/services/tutors';
import TutorFilters from '@/components/educators/TutorFilters';
import TutorCard from '@/components/educators/TutorCard';

export default async function EducatorsPage({
  searchParams,
}: {
  searchParams: { subject?: string; governorate?: string };
}) {
  const tutors = await getTutors({
    subjectId: parsePositiveIntId(searchParams.subject),
    governorateId: parsePositiveIntId(searchParams.governorate),
  });

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom color="primary" fontWeight="bold">
        تصفح المعلمين
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        تصفح قائمة المعلمين المعتمدين وابحث بالمادة أو المحافظة.
      </Typography>

      <TutorFilters />

      {tutors.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Box sx={{ position: 'relative', height: 200, mb: 4 }}>
            <Image src="/images/empty_educators.jpg" alt="لا يوجد معلمون" fill style={{ objectFit: 'contain' }} />
          </Box>
          <Typography variant="h6" color="text.secondary">
            لا يوجد معلمون مطابقون حالياً.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={4}>
          {tutors.map((tutor) => (
            <Grid item xs={12} sm={6} md={4} key={tutor.id}>
              <TutorCard tutor={tutor} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
