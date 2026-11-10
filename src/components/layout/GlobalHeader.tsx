'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppBar, Toolbar, Typography, Button, Box, Container, Drawer, IconButton, List, ListItemButton, ListItemText, Divider, Stack } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SignOutButton from './SignOutButton';
import NotificationBell from '@/components/notifications/NotificationBell';
import type { HeaderNotifications } from '@/components/notifications/headerNotifications';

// One list for the desktop bar and the phone menu (NAB-99). `visitorsOnly` links are hidden
// from signed-in users, who already have an account (NAB-100).
export const NAV_LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/educators', label: 'ابحث عن متخصص' },
  { href: '/requests', label: 'طلبات أولياء الأمور' },
  { href: '/register?role=educator', label: 'انضم كمتخصص', highlight: true, visitorsOnly: true },
  { href: '/about', label: 'عن نبني' },
  { href: '/faq', label: 'الأسئلة الشائعة' },
] as const;

const NO_ITEMS: HeaderNotifications['items'] = [];

const capIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
);

function AccountActions({ signedIn, stacked = false }: { signedIn: boolean; stacked?: boolean }) {
  return (
    <Stack direction={stacked ? 'column' : 'row'} spacing={1}>
      {signedIn ? (
        <>
          <Button component={Link} href="/dashboard" variant="contained" color="primary" sx={{ borderRadius: 6, boxShadow: 'none' }}>
            لوحتي
          </Button>
          <SignOutButton />
        </>
      ) : (
        <>
          <Button component={Link} href="/login" variant="outlined" color="primary" sx={{ borderRadius: 6 }}>
            تسجيل الدخول
          </Button>
          <Button component={Link} href="/register" variant="contained" color="primary" sx={{ borderRadius: 6, boxShadow: 'none' }}>
            إنشاء حساب
          </Button>
        </>
      )}
    </Stack>
  );
}

/**
 * `signedIn` swaps the login/register buttons for the dashboard link and sign-out (NAB-93).
 * `notifications` feeds the bell, shown to signed-in users only, on phones too (NAB-107).
 */
export default function GlobalHeader({ signedIn = false, notifications }: { signedIn?: boolean; notifications?: HeaderNotifications }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = NAV_LINKS.filter((link) => !('visitorsOnly' in link && link.visitorsOnly && signedIn));

  return (
    <AppBar position="sticky" color="inherit" elevation={1} sx={{ borderBottom: '1px solid #eaeaea' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between', gap: 1 }}>
          <Typography
            variant="h6"
            noWrap
            component={Link}
            href="/"
            sx={{ mr: 2, fontWeight: 700, color: 'primary.main', textDecoration: 'none' }}
          >
            Nabni
          </Typography>

          {/* Desktop navigation */}
          <Box component="nav" aria-label="القائمة الرئيسية" sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 3 }}>
            {links.map((link) =>
              'highlight' in link && link.highlight ? (
                <Button
                  key={link.href}
                  component={Link}
                  href={link.href}
                  startIcon={capIcon}
                  sx={{ color: 'primary.main', fontWeight: 'bold', bgcolor: 'primary.50', px: 2, borderRadius: 4, '&:hover': { bgcolor: 'primary.100' } }}
                >
                  {link.label}
                </Button>
              ) : (
                <Button key={link.href} component={Link} href={link.href} sx={{ color: 'text.primary', fontWeight: 500 }}>
                  {link.label}
                </Button>
              ),
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {signedIn && (
              <NotificationBell
                unreadCount={notifications?.unreadCount ?? 0}
                items={notifications?.items ?? NO_ITEMS}
                viewAllHref="/notifications"
              />
            )}
            {/* On phones the account buttons move into the menu to leave room for the logo. */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' } }}>
              <AccountActions signedIn={signedIn} />
            </Box>
            <IconButton
              aria-label="القائمة"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              sx={{ display: { xs: 'inline-flex', md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </Container>

      {/* Phone menu (NAB-99) */}
      <Drawer anchor="right" open={menuOpen} onClose={() => setMenuOpen(false)}>
        <Box component="nav" aria-label="قائمة الموقع" sx={{ width: 260, p: 2 }}>
          <List>
            {links.map((link) => (
              <ListItemButton key={link.href} component={Link} href={link.href} onClick={() => setMenuOpen(false)}>
                <ListItemText
                  primary={link.label}
                  primaryTypographyProps={{ fontWeight: 'highlight' in link && link.highlight ? 'bold' : 500, color: 'highlight' in link && link.highlight ? 'primary' : 'text.primary' }}
                />
              </ListItemButton>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Box onClick={() => setMenuOpen(false)}>
            <AccountActions signedIn={signedIn} stacked />
          </Box>
        </Box>
      </Drawer>
    </AppBar>
  );
}
