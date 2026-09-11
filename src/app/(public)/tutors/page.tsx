import { Container, Typography } from '@mui/material';

export default function TutorsPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom color="primary">
        تصفح المعلمين
      </Typography>
      <Typography variant="body1">
        هذه الصفحة ستعرض قائمة المعلمين المتاحين للبحث والفلترة. (جاري التطوير)
      </Typography>
    </Container>
  );
}
