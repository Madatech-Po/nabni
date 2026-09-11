'use client';

import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import Link from 'next/link';

export default function GlobalHeader() {
  return (
    <AppBar position="sticky" color="inherit" elevation={1} sx={{ borderBottom: '1px solid #eaeaea' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          {/* Logo / Brand */}
          <Typography
            variant="h6"
            noWrap
            component={Link}
            href="/"
            sx={{
              mr: 2,
              fontWeight: 700,
              color: 'primary.main',
              textDecoration: 'none',
            }}
          >
            Nabni
          </Typography>

          {/* Center Navigation */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 3 }}>
            <Button component={Link} href="/" sx={{ color: 'text.primary', fontWeight: 500 }}>الرئيسية</Button>
            <Button component={Link} href="/educators" sx={{ color: 'text.primary', fontWeight: 500 }}>ابحث عن متخصص</Button>
            <Button component={Link} href="/requests" sx={{ color: 'text.primary', fontWeight: 500 }}>طلبات أولياء الأمور</Button>
            <Button 
              component={Link} 
              href="/register?role=educator" 
              sx={{ 
                color: 'primary.main', 
                fontWeight: 'bold',
                bgcolor: 'primary.50',
                px: 2,
                borderRadius: 4,
                '&:hover': { bgcolor: 'primary.100' },
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              انضم كمتخصص
            </Button>
            <Button component={Link} href="/about" sx={{ color: 'text.primary', fontWeight: 500 }}>عن نبني</Button>
            <Button component={Link} href="/faq" sx={{ color: 'text.primary', fontWeight: 500 }}>الأسئلة الشائعة</Button>
          </Box>

          {/* Right Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button component={Link} href="/login" variant="outlined" color="primary" sx={{ borderRadius: 6 }}>
              تسجيل الدخول
            </Button>
            <Button component={Link} href="/register" variant="contained" color="primary" sx={{ borderRadius: 6, boxShadow: 'none' }}>
              إنشاء حساب
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
