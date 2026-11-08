import Link from 'next/link';
import { Alert, AlertTitle, Box, Button } from '@mui/material';
import type { EducatorVerificationStatus } from '@/types/database';

const REASONS: Record<EducatorVerificationStatus | 'no_profile' | 'inactive', { title: string; body: string }> = {
  no_profile: { title: 'أكمل ملفك أولاً', body: 'لتقديم عروض لأولياء الأمور، أكمل ملفك الشخصي كمتخصص.' },
  pending: { title: 'ملفك قيد المراجعة', body: 'يمكنك تقديم العروض بعد أن يوثّق فريق نبني ملفك. عادةً لا يستغرق ذلك طويلاً.' },
  rejected: { title: 'لم يتم توثيق ملفك', body: 'راجع بيانات ملفك أو تواصل مع فريق نبني لمعرفة السبب.' },
  suspended: { title: 'تم إيقاف حسابك', body: 'لا يمكنك تقديم عروض حالياً. تواصل مع فريق نبني إذا كنت تعتقد أن هذا خطأ.' },
  inactive: { title: 'حسابك غير مفعّل', body: 'لا يمكنك تقديم عروض حالياً. تواصل مع فريق نبني.' },
  verified: { title: '', body: '' },
};

const HAS_ADMIN_NOTE = new Set<keyof typeof REASONS>(['rejected', 'suspended']);

/**
 * Why an educator can't send offers, and where to go from here. `note` is the admin's own
 * reason for a rejection or suspension (NAB-97); it's shown only for those two states.
 */
export default function CannotOfferNotice({ reason, note }: { reason: keyof typeof REASONS; note?: string | null }) {
  const { title, body } = REASONS[reason];
  const adminNote = HAS_ADMIN_NOTE.has(reason) ? note?.trim() : undefined;
  const href = reason === 'no_profile' || reason === 'rejected' ? '/teacher/profile' : '/contact';
  return (
    <Alert severity="warning" variant="outlined">
      <AlertTitle sx={{ fontWeight: 'bold' }}>{title}</AlertTitle>
      {adminNote && (
        <Box sx={{ mb: 1 }}>
          <strong>سبب القرار:</strong> {adminNote}
        </Box>
      )}
      {body}
      <Button component={Link} href={href} size="small" variant="contained" sx={{ display: 'block', width: 'fit-content', mt: 2 }}>
        {href === '/contact' ? 'تواصل معنا' : 'ملفي الشخصي'}
      </Button>
    </Alert>
  );
}
