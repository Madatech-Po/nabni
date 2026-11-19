import { Container, Typography, Paper, Box } from '@mui/material';
import Link from 'next/link';
import ForgotPasswordForm from './ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight="bold" color="primary">
          نسيت كلمة المرور؟
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          اكتب بريدك الإلكتروني وسنرسل لك رابطاً لتعيين كلمة مرور جديدة
        </Typography>

        <ForgotPasswordForm />

        <Box mt={3}>
          <Typography variant="body2">
            تذكرت كلمة المرور؟{' '}
            <Link href="/login" style={{ color: '#0d9488', fontWeight: 'bold', textDecoration: 'none' }}>
              تسجيل الدخول
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
