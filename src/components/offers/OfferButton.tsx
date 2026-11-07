import Link from 'next/link';
import { Button } from '@mui/material';

/** The educator's call to action on a request card in the feed. */
export default function OfferButton({ requestId, alreadyOffered }: { requestId: string; alreadyOffered: boolean }) {
  return alreadyOffered ? (
    <Button component={Link} href="/teacher/offers" variant="outlined" color="success" fullWidth>
      تم إرسال عرضك
    </Button>
  ) : (
    <Button component={Link} href={`/teacher/requests/${requestId}/offer`} variant="contained" fullWidth>
      قدّم عرضك
    </Button>
  );
}
