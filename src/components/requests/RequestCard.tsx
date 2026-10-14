import { Card, CardContent, Typography, Box, Chip, Stack } from '@mui/material';
import { MapPin, User, Home, DollarSign, Clock, GraduationCap } from 'lucide-react';
import type { RequestFeedItem } from '@/services/requests';

function genderLabel(gender: RequestFeedItem['preferred_educator_gender']): string {
  if (gender === 'male') return 'معلم';
  if (gender === 'female') return 'معلمة';
  return 'لا يوجد تفضيل';
}

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
            label={request.service_category?.name_ar ?? 'خدمة غير محددة'}
            color="primary"
            sx={{ fontWeight: 'bold' }}
          />
          <Chip label={genderLabel(request.preferred_educator_gender)} size="small" variant="outlined" />
        </Box>

        <Stack spacing={1.5} mb={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <MapPin size={18} />
            <Typography variant="body2">
              {request.governorate?.name_ar} {request.area ? `- ${request.area}` : ''}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <User size={18} />
            <Typography variant="body2">{request.student_age} سنوات</Typography>
          </Box>
          {request.education_level && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <GraduationCap size={18} />
              <Typography variant="body2">{request.education_level.name_ar}</Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <Home size={18} />
            <Typography variant="body2">{request.teaching_place?.name_ar}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <DollarSign size={18} />
            <Typography variant="body2" color={!request.budget ? 'success.main' : 'inherit'}>
              {request.budget
                ? `${request.budget} ج.م${request.pricing_unit ? ` / ${request.pricing_unit.name_ar}` : ''}`
                : 'قابل للتفاوض'}
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
