'use client';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import rtlPlugin from 'stylis-plugin-rtl';
import AppThemeProvider from '@/theme/ThemeProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: 'muirtl', stylisPlugins: [rtlPlugin] }}>
      <AppThemeProvider>
        {children}
      </AppThemeProvider>
    </AppRouterCacheProvider>
  );
}
