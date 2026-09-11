import { Container, Typography } from '@mui/material';

export default function FaqPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom color="primary">
        الأسئلة الشائعة
      </Typography>
      <Typography variant="body1">
        إجابات لأهم الأسئلة التي تهم أولياء الأمور والمعلمين. (جاري التطوير)
      </Typography>
    </Container>
  );
}
