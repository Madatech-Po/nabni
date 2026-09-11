'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Container, Typography, Grid, Card, CardContent, CardActions, Button, Chip, Stack } from '@mui/material';
import { MapPin, User, Video, Home, DollarSign, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const MOCK_REQUESTS = [
  {
    id: 1,
    service: 'تأسيس لغة عربية',
    isNew: true,
    governorate: 'القاهرة',
    age: '6 سنوات',
    sessionType: 'online',
    budget: '', // negotiable
    postedAt: 'منذ ساعة',
    description: 'أبحث عن معلمة تأسيس لغة عربية لابني في الصف الأول الابتدائي، يفضل أن يكون لديها خبرة في منهج نور البيان.'
  },
  {
    id: 2,
    service: 'تأسيس رياضيات',
    isNew: true,
    governorate: 'الجيزة',
    age: '8 سنوات',
    sessionType: 'in-person',
    budget: '150 ج.م / حصة',
    postedAt: 'منذ 3 ساعات',
    description: 'نحتاج لمعلم رياضيات للتدريس الحضوري بمعدل حصتين أسبوعياً.'
  },
  {
    id: 3,
    service: 'تخاطب',
    isNew: false,
    governorate: 'الإسكندرية',
    age: '5 سنوات',
    sessionType: 'in-person',
    budget: '',
    postedAt: 'منذ يوم',
    description: 'ابنتي تعاني من تأخر في النطق وتحتاج لجلسات تخاطب متخصصة في المنزل.'
  },
  {
    id: 4,
    service: 'تأسيس لغة إنجليزية',
    isNew: false,
    governorate: 'أونلاين',
    age: '7 سنوات',
    sessionType: 'online',
    budget: '100 ج.م / حصة',
    postedAt: 'منذ يومين',
    description: 'تأسيس شامل في اللغة الإنجليزية، قراءة وكتابة.'
  },
  {
    id: 5,
    service: 'مونتيسوري',
    isNew: false,
    governorate: 'القاهرة',
    age: '4 سنوات',
    sessionType: 'in-person',
    budget: '200 ج.م / حصة',
    postedAt: 'منذ يومين',
    description: 'تطبيق أنشطة المونتيسوري لتنمية مهارات الطفل الحركية والذهنية.'
  },
  {
    id: 6,
    service: 'صعوبات تعلم',
    isNew: false,
    governorate: 'أونلاين',
    age: '9 سنوات',
    sessionType: 'online',
    budget: '',
    postedAt: 'منذ 3 أيام',
    description: 'مطلوب متخصص للتعامل مع تشتت الانتباه وصعوبات القراءة.'
  }
];

// Reusable component for animating fade in
function FadeInView({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={ref}
      sx={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
        height: '100%'
      }}
    >
      {children}
    </Box>
  );
}

export default function LatestRequests() {
  if (MOCK_REQUESTS.length === 0) {
    return (
      <Box sx={{ py: 10, bgcolor: 'common.white', textAlign: 'center' }}>
        <Container maxWidth="md">
          <Box sx={{ position: 'relative', height: 250, mb: 4 }}>
             <Image src="/images/empty_requests.jpg" alt="No Requests" fill style={{ objectFit: 'contain' }} />
          </Box>
          <Typography variant="h5" color="text.secondary">
            لا توجد طلبات منشورة حتى الآن.
          </Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 10, bgcolor: 'common.white' }}>
      <Container maxWidth="lg">
        {/* Section Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 6, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h3" color="primary" fontWeight="bold" gutterBottom>
              يبحث أولياء الأمور الآن عن...
            </Typography>
            <Typography variant="h6" color="text.secondary">
              استعرض أحدث الطلبات المنشورة. إذا كنت متخصصًا مناسبًا يمكنك تقديم عرض بعد إنشاء حساب.
            </Typography>
          </Box>
          <Button component={Link} href="/requests" variant="outlined" size="large" sx={{ borderRadius: 8 }}>
            عرض جميع الطلبات
          </Button>
        </Box>

        {/* Requests Grid */}
        <Grid container spacing={4}>
          {MOCK_REQUESTS.map((request, index) => (
            <Grid item xs={12} sm={6} md={4} key={request.id}>
              <FadeInView delay={index * 100}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    borderRadius: 4,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Chip label={request.service} color="primary" sx={{ fontWeight: 'bold' }} />
                      {request.isNew && (
                        <Chip label="جديد" color="error" size="small" sx={{ height: 24 }} />
                      )}
                    </Box>

                    <Stack spacing={1.5} mb={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                        <MapPin size={18} />
                        <Typography variant="body2">{request.governorate}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                        <User size={18} />
                        <Typography variant="body2">{request.age}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                        {request.sessionType === 'online' ? <Video size={18} /> : <Home size={18} />}
                        <Typography variant="body2">{request.sessionType === 'online' ? 'أونلاين' : 'حضوري (في المنزل)'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                        <DollarSign size={18} />
                        <Typography variant="body2" color={!request.budget ? 'success.main' : 'inherit'}>
                          {request.budget || 'قابل للتفاوض'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                        <Clock size={18} />
                        <Typography variant="body2">{request.postedAt}</Typography>
                      </Box>
                    </Stack>

                    <Typography 
                      variant="body1" 
                      color="text.primary" 
                      sx={{ 
                        mt: 2,
                        display: '-webkit-box', 
                        WebkitLineClamp: 2, 
                        WebkitBoxOrient: 'vertical', 
                        overflow: 'hidden',
                        lineHeight: 1.6
                      }}
                    >
                      {request.description}
                    </Typography>
                  </CardContent>

                  <CardActions sx={{ p: 3, pt: 0, gap: 1 }}>
                    <Button 
                      component={Link} 
                      href={`/requests/${request.id}`} 
                      variant="outlined" 
                      sx={{ flexGrow: 1, borderRadius: 2 }}
                    >
                      عرض التفاصيل
                    </Button>
                    <Button 
                      component={Link} 
                      href={`/requests/${request.id}/proposal`} 
                      variant="contained" 
                      sx={{ flexGrow: 1, borderRadius: 2 }}
                    >
                      تقديم عرض
                    </Button>
                  </CardActions>
                </Card>
              </FadeInView>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
