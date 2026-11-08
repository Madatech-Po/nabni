import { Box, Container, Typography, Paper } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import TeacherProfileForm from './TeacherProfileForm';
import CannotOfferNotice from '@/components/offers/CannotOfferNotice';
import { getEducatorOfferingState } from '@/services/offers';

export default async function TeacherProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  // A rejected or suspended educator sees the admin's reason while fixing their profile (NAB-97).
  const educator = await getEducatorOfferingState(user.id);
  const status = educator?.verificationStatus;

  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
      {(status === 'rejected' || status === 'suspended') && (
        <Box sx={{ mb: 3 }}>
          <CannotOfferNotice reason={status} note={educator?.verificationReason} />
        </Box>
      )}
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight="bold" color="primary">
          إعداد ملفك الشخصي كمعلم
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={4}>
          أكمل هذه البيانات لتظهر لأولياء الأمور المهتمين بالتأسيس في منطقتك.
        </Typography>
        
        <TeacherProfileForm userId={user.id} defaultFullName={profile?.full_name ?? ''} />
      </Paper>
    </Container>
  );
}
