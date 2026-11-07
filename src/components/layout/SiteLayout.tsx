import { Box } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import GlobalHeader from './GlobalHeader';
import GlobalFooter from './GlobalFooter';

// The site's header and footer around public pages and the parent/educator dashboards, so a
// signed-in user can always get home, back to their dashboard, or sign out (NAB-93).
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <GlobalHeader signedIn={Boolean(user)} />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
      <GlobalFooter />
    </Box>
  );
}
