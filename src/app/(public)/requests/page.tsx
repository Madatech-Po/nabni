import { Container, Typography } from '@mui/material';

export default function RequestsPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom color="primary">
        طلبات أولياء الأمور
      </Typography>
      <Typography variant="body1">
        هذه الصفحة ستعرض الطلبات المفتوحة من أولياء الأمور. (جاري التطوير)
      </Typography>
    </Container>
  );
}
