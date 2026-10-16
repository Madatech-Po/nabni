import { Box, Container, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

// The middleware only guarantees a signed-in user; the role check lives here so every /admin
// page is covered. The database enforces the same rule through is_admin() (NAB-37).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?redirectTo=/admin');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' || !profile.is_active) redirect('/dashboard');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Box component="header" sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 2 }}>
        <Container maxWidth="lg">
          <Stack direction="row" spacing={4} alignItems="center">
            <Typography variant="h6" fontWeight="bold">لوحة تحكم نبني</Typography>
            <Link href="/admin/educators" style={{ color: 'inherit', textDecoration: 'none' }}>
              توثيق المعلمين
            </Link>
          </Stack>
        </Container>
      </Box>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
