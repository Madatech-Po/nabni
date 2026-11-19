import { Container, Typography, Paper } from '@mui/material';
import ResetPasswordForm from './ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight="bold" color="primary">
          تعيين كلمة مرور جديدة
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          اختر كلمة مرور جديدة لحسابك
        </Typography>

        <ResetPasswordForm />
      </Paper>
    </Container>
  );
}
