import { Container, Typography } from '@mui/material';

export default function AboutPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom color="primary">
        عن منصة نبني
      </Typography>
      <Typography variant="body1">
        نبني هي المنصة الأولى المتخصصة في ربط أولياء الأمور بأفضل معلمي التأسيس في مصر.
      </Typography>
    </Container>
  );
}
