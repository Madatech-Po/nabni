import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import type { AdminOfferItem } from '@/services/admin';
import type { OfferStatus } from '@/types/database';
import { OFFER_STATUS_COLORS } from '@/components/offers/offerStatus';
import { formatDate } from '@/utils/formatDate';
import RemoveOfferAction from './RemoveOfferAction';

const ADMIN_OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  pending: 'بانتظار ولي الأمر',
  accepted: 'مقبول',
  declined: 'مرفوض',
  withdrawn: 'سحبه المتخصص',
  archived: 'مؤرشف',
  removed: 'أزالته الإدارة',
};

/** The offers on one request, for moderation (NAB-86). */
export default function AdminRequestOffers({ offers }: { offers: AdminOfferItem[] }) {
  if (offers.length === 0) {
    return <Typography variant="body2" color="text.secondary">لا توجد عروض على هذا الطلب.</Typography>;
  }

  const sorted = [...offers].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight="bold" mb={1}>العروض ({offers.length})</Typography>
      <Stack divider={<Divider flexItem />} spacing={1}>
        {sorted.map((offer) => (
          <Box key={offer.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" fontWeight="bold">{offer.educator?.full_name ?? 'متخصص'}</Typography>
            <Typography variant="body2">
              {offer.price} ج.م{offer.pricing_unit ? ` / ${offer.pricing_unit.name_ar}` : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">{formatDate(offer.created_at)}</Typography>
            <Chip size="small" label={ADMIN_OFFER_STATUS_LABELS[offer.status]} color={OFFER_STATUS_COLORS[offer.status]} />
            {(offer.status === 'pending' || offer.status === 'accepted') && (
              <Box sx={{ marginInlineStart: 'auto' }}>
                <RemoveOfferAction offerId={offer.id} />
              </Box>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
