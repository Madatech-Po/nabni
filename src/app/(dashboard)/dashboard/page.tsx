import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the user's role from the profile table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'teacher') {
    redirect('/teacher');
  } else if (profile?.role === 'parent') {
    redirect('/parent');
  } else if (profile?.role === 'admin') {
    redirect('/admin');
  }

  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" color="primary" gutterBottom>
          لوحة التحكم العامة
        </Typography>
        <Typography variant="body1">
          مرحباً {user.email}. يتم الآن توجيهك...
        </Typography>
      </Paper>
    </Container>
  );
}
