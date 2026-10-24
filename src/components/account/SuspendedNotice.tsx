import Link from 'next/link';
import { Alert, AlertTitle, Button, Container } from '@mui/material';

// Shown in place of the dashboard for an account an admin suspended (profiles.is_active =
// false). The database already blocks their writes (NAB-51); this explains why.
export default function SuspendedNotice() {
  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Alert severity="warning" variant="outlined" sx={{ p: 3 }}>
        <AlertTitle sx={{ fontWeight: 'bold' }}>تم إيقاف حسابك</AlertTitle>
        لا يمكنك نشر طلبات جديدة أو تعديل طلباتك الحالية، ولا تظهر طلباتك للمتخصصين حالياً.
        إذا كنت تعتقد أن هذا خطأ، تواصل مع فريق نبني.
        <Button component={Link} href="/contact" variant="contained" sx={{ display: 'block', width: 'fit-content', mt: 2 }}>
          تواصل معنا
        </Button>
      </Alert>
    </Container>
  );
}
