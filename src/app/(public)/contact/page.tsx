import { Container, Typography } from '@mui/material';

export default function ContactPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom color="primary">
        تواصل معنا
      </Typography>
      <Typography variant="body1">
        يمكنك التواصل مع فريق الدعم في منصة نبني. (جاري التطوير)
      </Typography>
    </Container>
  );
}
