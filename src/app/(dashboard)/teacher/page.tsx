import { Box, Typography, Container, Paper } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function TeacherDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single();

  if (!profile?.onboarding_completed) {
    redirect('/teacher/profile');
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 8 }}>
      <Typography variant="h4" gutterBottom color="primary">لوحة تحكم المعلم</Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">هنا ستظهر طلبات التدريس المفتوحة.</Typography>
      </Paper>
    </Container>
  );
}
