import { Box, Typography, Container, Paper } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function ParentDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_profile_complete')
    .eq('id', user.id)
    .single();

  if (!profile?.is_profile_complete) {
    redirect('/parent/profile');
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 8 }}>
      <Typography variant="h4" gutterBottom color="primary">لوحة تحكم ولي الأمر</Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">هنا ستظهر طلباتك وعروض المعلمين.</Typography>
      </Paper>
    </Container>
  );
}
