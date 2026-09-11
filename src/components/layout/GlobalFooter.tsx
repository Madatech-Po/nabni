import { Box, Container, Grid, Typography, Link as MuiLink } from '@mui/material';
import Link from 'next/link';

export default function GlobalFooter() {
  return (
    <Box component="footer" sx={{ bgcolor: 'grey.100', pt: 6, pb: 4, mt: 'auto' }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="primary" gutterBottom>
              Nabni
            </Typography>
            <Typography variant="body2" color="text.secondary">
              المنصة الأولى لربط أولياء الأمور بأفضل معلمي التأسيس في مصر.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              روابط سريعة
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <MuiLink component={Link} href="/tutors" color="text.secondary" underline="hover">تصفح المعلمين</MuiLink>
              <MuiLink component={Link} href="/about" color="text.secondary" underline="hover">عن المنصة</MuiLink>
              <MuiLink component={Link} href="/faq" color="text.secondary" underline="hover">الأسئلة الشائعة</MuiLink>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              الشروط والخصوصية
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <MuiLink component={Link} href="/privacy" color="text.secondary" underline="hover">سياسة الخصوصية</MuiLink>
              <MuiLink component={Link} href="/terms" color="text.secondary" underline="hover">الشروط والأحكام</MuiLink>
              <MuiLink component={Link} href="/contact" color="text.secondary" underline="hover">تواصل معنا</MuiLink>
            </Box>
          </Grid>
        </Grid>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4, pt: 2, borderTop: '1px solid #ddd' }}>
          © {new Date().getFullYear()} Nabni. جميع الحقوق محفوظة.
        </Typography>
      </Container>
    </Box>
  );
}
