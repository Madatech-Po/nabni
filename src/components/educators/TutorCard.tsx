import { Card, CardContent, Avatar, Typography, Box, Chip, Stack } from '@mui/material';
import { MapPin, Briefcase } from 'lucide-react';
import type { EducatorDirectoryItem } from '@/services/tutors';

export default function TutorCard({ tutor }: { tutor: EducatorDirectoryItem }) {
  const fullName = tutor.full_name || 'معلم نبني';
  const initial = fullName[0];

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 3, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Avatar src={tutor.profile_image || undefined} alt={fullName} sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: '1.5rem' }}>
            {initial}
          </Avatar>
        </Box>

        <Typography variant="h6" fontWeight="bold" align="center" gutterBottom>
          {fullName}
        </Typography>

        <Stack direction="row" spacing={2} justifyContent="center" mb={2} flexWrap="wrap">
          {tutor.governorate_name_ar && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MapPin size={16} color="#757575" />
              <Typography variant="caption" color="text.secondary">
                {tutor.governorate_name_ar}
              </Typography>
            </Box>
          )}
          {tutor.experience_years != null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Briefcase size={16} color="#757575" />
              <Typography variant="caption" color="text.secondary">
                {tutor.experience_years} سنوات خبرة
              </Typography>
            </Box>
          )}
        </Stack>

        {tutor.subjects.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 2 }}>
            {tutor.subjects.slice(0, 3).map((s) => (
              <Chip key={s.id} label={s.name_ar} size="small" sx={{ bgcolor: 'primary.50', color: 'primary.main', fontWeight: 500 }} />
            ))}
          </Box>
        )}

        {tutor.bio && (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {tutor.bio}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
