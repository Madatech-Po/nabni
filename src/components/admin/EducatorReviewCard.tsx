import { Card, CardContent, Avatar, Typography, Box, Chip, Stack, Divider } from '@mui/material';
import type { AdminEducatorItem } from '@/services/admin';
import { STATUS_COLORS, STATUS_LABELS } from './verificationStatus';

function names(items: ({ name_ar: string } | null)[]): string[] {
  return items.filter((item): item is { name_ar: string } => Boolean(item)).map((item) => item.name_ar);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>{label}</Typography>
      <Typography variant="body2" component="div">{value}</Typography>
    </Box>
  );
}

function ChipList({ values }: { values: string[] }) {
  if (values.length === 0) return <>—</>;
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {values.map((v) => <Chip key={v} label={v} size="small" />)}
    </Box>
  );
}

export default function EducatorReviewCard({
  educator,
  actions,
}: {
  educator: AdminEducatorItem;
  actions?: React.ReactNode;
}) {
  const status = educator.verification_status ?? 'pending';
  const genderLabel = educator.gender === 'male' ? 'معلم' : educator.gender === 'female' ? 'معلمة' : '—';

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Avatar src={educator.profile_image || undefined} sx={{ width: 56, height: 56 }}>
            {educator.full_name[0]}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight="bold">{educator.full_name}</Typography>
            <Typography variant="caption" color="text.secondary">
              سجّل في {educator.created_at ? new Date(educator.created_at).toLocaleDateString('ar-EG') : '—'}
            </Typography>
          </Box>
          <Chip label={STATUS_LABELS[status]} color={STATUS_COLORS[status]} />
        </Stack>

        <Stack spacing={1}>
          <Row label="الهاتف" value={<span dir="ltr">{educator.phone}</span>} />
          <Row label="واتساب" value={educator.whatsapp_number ? <span dir="ltr">{educator.whatsapp_number}</span> : '—'} />
          <Row label="النوع" value={genderLabel} />
          <Row label="محافظة الإقامة" value={educator.governorate?.name_ar ?? '—'} />
          <Row label="سنوات الخبرة" value={educator.experience_years ?? '—'} />
          <Row label="الخدمات" value={<ChipList values={names(educator.subjects.map((s) => s.subject))} />} />
          <Row label="المراحل" value={<ChipList values={names(educator.levels.map((l) => l.level))} />} />
          <Row label="يدرّس في" value={<ChipList values={names(educator.locations.map((l) => l.governorate))} />} />
        </Stack>

        {educator.bio && (
          <Typography variant="body2" sx={{ mt: 2, whiteSpace: 'pre-line' }}>{educator.bio}</Typography>
        )}

        {actions && (
          <>
            <Divider sx={{ my: 2 }} />
            {actions}
          </>
        )}
      </CardContent>
    </Card>
  );
}
