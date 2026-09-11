import { Container, Typography, Paper } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ParentProfileForm from './ParentProfileForm';

export default async function ParentProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight="bold" color="primary">
          إكمال بيانات ولي الأمر
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={4}>
          نحتاج إلى بعض التفاصيل لنتمكن من عرض طلبك لمعلمي التأسيس القريبين منك.
        </Typography>
        
        <ParentProfileForm userId={user.id} />
      </Paper>
    </Container>
  );
}
