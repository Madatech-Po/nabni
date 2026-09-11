import GlobalHeader from '@/components/layout/GlobalHeader';
import GlobalFooter from '@/components/layout/GlobalFooter';
import { Box } from '@mui/material';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <GlobalHeader />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
      <GlobalFooter />
    </Box>
  );
}
