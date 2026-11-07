import type { ReactNode } from 'react';
import { Avatar, Box, Chip, Paper, Typography } from '@mui/material';
import type { OfferForParent } from '@/services/offers';
import type { OfferStatus } from '@/types/database';
import { OFFER_STATUS_COLORS } from './offerStatus';
import { formatDate } from '@/utils/formatDate';

// How the parent sees each status of an offer on their request.
export const PARENT_OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  pending: 'بانتظار ردك',
  accepted: 'العرض المقبول',
  declined: 'مرفوض',
  withdrawn: 'سحبه المتخصص',
  archived: 'أُغلق الطلب',
  removed: 'أزالته الإدارة',
};

export default function ParentOfferCard({ offer, actions }: { offer: OfferForParent; actions?: ReactNode }) {
  const educator = offer.educator;
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, borderColor: offer.status === 'accepted' ? 'success.main' : undefined, borderWidth: offer.status === 'accepted' ? 2 : 1 }}
    >
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <Avatar src={educator?.profile_image ?? undefined} sx={{ width: 56, height: 56 }}>
          {educator?.full_name?.charAt(0)}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography fontWeight="bold">{educator?.full_name ?? 'متخصص'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {[
              educator?.experience_years ? `${educator.experience_years} سنوات خبرة` : null,
              educator?.governorate_name_ar,
            ].filter(Boolean).join(' • ')}
          </Typography>
        </Box>
        <Chip size="small" label={PARENT_OFFER_STATUS_LABELS[offer.status]} color={OFFER_STATUS_COLORS[offer.status]} />
      </Box>

      <Typography variant="h6" fontWeight="bold" color="primary">
        {offer.price} ج.م{offer.pricing_unit ? ` / ${offer.pricing_unit.name_ar}` : ''}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mt: 0.5 }}>المواعيد: {offer.schedule}</Typography>
      {offer.start_date && <Typography variant="body2">يمكنه البدء: {formatDate(offer.start_date)}</Typography>}
      {offer.notes && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, whiteSpace: 'pre-line' }}>{offer.notes}</Typography>
      )}
      {educator?.bio && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          نبذة: {educator.bio}
        </Typography>
      )}

      {actions && <Box sx={{ mt: 2 }}>{actions}</Box>}
    </Paper>
  );
}
