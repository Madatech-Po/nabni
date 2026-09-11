import { Container, Typography, Paper, Box } from '@mui/material';
import Link from 'next/link';
import RegisterForm from './RegisterForm';

export default function RegisterPage() {
  return (
    <Container maxWidth="xs" sx={{ mt: 8, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight="bold" color="primary">
          إنشاء حساب جديد
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          انضم إلينا كولي أمر أو معلم
        </Typography>
        
        <RegisterForm />
        
        <Box mt={3}>
          <Typography variant="body2">
            لديك حساب بالفعل؟{' '}
            <Link href="/login" style={{ color: '#0d9488', fontWeight: 'bold', textDecoration: 'none' }}>
              تسجيل الدخول
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
