import { Box } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import { getHeaderNotifications } from '@/components/notifications/headerNotifications';
import GlobalHeader from './GlobalHeader';
import GlobalFooter from './GlobalFooter';

// The site's header and footer around public pages and the parent/educator dashboards, so a
// signed-in user can always get home, back to their dashboard, or sign out (NAB-93).
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Visitors have no notifications, so nothing is read for them (NAB-107).
  const notifications = user ? await getHeaderNotifications() : undefined;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <GlobalHeader signedIn={Boolean(user)} notifications={notifications} />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
      <GlobalFooter />
    </Box>
  );
}
