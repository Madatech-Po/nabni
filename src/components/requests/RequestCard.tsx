import { Card, CardContent, Typography, Box, Chip, Stack } from '@mui/material';
import { MapPin, User, Video, Home, DollarSign, Clock } from 'lucide-react';
import type { RequestFeedItem } from '@/services/requests';

const METHOD_LABELS: Record<RequestFeedItem['preferred_teaching_method'], string> = {
  online: 'أونلاين',
  offline: 'حضوري',
  both: 'حضوري أو أونلاين',
};

const GENDER_LABELS: Record<RequestFeedItem['preferred_teacher_gender'], string> = {
  male: 'معلم',
  female: 'معلمة',
  any: 'لا يوجد تفضيل',
};

function timeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export default function RequestCard({ request }: { request: RequestFeedItem }) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Chip
            label={request.subject ? `${request.subject.name} - ${request.subject.level}` : 'مادة غير محددة'}
            color="primary"
            sx={{ fontWeight: 'bold' }}
          />
          <Chip label={GENDER_LABELS[request.preferred_teacher_gender]} size="small" variant="outlined" />
        </Box>

        <Stack spacing={1.5} mb={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <MapPin size={18} />
            <Typography variant="body2">
              {request.governorate?.name} {request.area ? `- ${request.area}` : ''}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <User size={18} />
            <Typography variant="body2">{request.student_age} سنوات</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            {request.preferred_teaching_method === 'online' ? <Video size={18} /> : <Home size={18} />}
            <Typography variant="body2">{METHOD_LABELS[request.preferred_teaching_method]}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <DollarSign size={18} />
            <Typography variant="body2" color={!request.budget ? 'success.main' : 'inherit'}>
              {request.budget ? `${request.budget} ج.م` : 'قابل للتفاوض'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <Clock size={18} />
            <Typography variant="body2">{timeAgo(request.created_at)}</Typography>
          </Box>
        </Stack>

        <Typography
          variant="body1"
          color="text.primary"
          sx={{ mt: 2, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6 }}
        >
          {request.description}
        </Typography>
      </CardContent>
    </Card>
  );
}
