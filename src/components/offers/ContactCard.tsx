import { Alert, AlertTitle, Box, Button, Typography } from '@mui/material';
import type { OfferContact } from '@/services/offers';
import { whatsAppLink } from './contactLinks';

/** Contact details unlocked by an accepted offer (NAB-84). */
export default function ContactCard({ title, contact }: { title: string; contact: OfferContact | null }) {
  if (!contact) {
    return <Alert severity="info">لا تتوفر بيانات تواصل حالياً.</Alert>;
  }

  const whatsapp = whatsAppLink(contact.whatsapp_number || contact.phone || '');
  return (
    <Alert severity="success" variant="outlined" icon={false}>
      <AlertTitle sx={{ fontWeight: 'bold' }}>{title}</AlertTitle>
      <Typography fontWeight="bold">{contact.full_name}</Typography>
      {contact.phone ? (
        <Typography dir="ltr" sx={{ textAlign: 'right' }}>{contact.phone}</Typography>
      ) : (
        <Typography color="text.secondary">لم يضف رقم هاتف بعد.</Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
        {contact.phone && (
          <Button component="a" href={`tel:${contact.phone}`} size="small" variant="contained">اتصال</Button>
        )}
        {whatsapp && (
          <Button component="a" href={whatsapp} target="_blank" rel="noopener noreferrer" size="small" variant="outlined" color="success">
            واتساب
          </Button>
        )}
      </Box>
    </Alert>
  );
}
