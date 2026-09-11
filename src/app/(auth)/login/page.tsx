import { Container, Typography, Paper, Box } from '@mui/material';
import Link from 'next/link';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight="bold" color="primary">
          تسجيل الدخول
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          أهلاً بك مجدداً في منصة نبني
        </Typography>
        
        <LoginForm />
        
        <Box mt={3}>
          <Typography variant="body2">
            ليس لديك حساب؟{' '}
            <Link href="/register" style={{ color: '#0d9488', fontWeight: 'bold', textDecoration: 'none' }}>
              إنشاء حساب جديد
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
