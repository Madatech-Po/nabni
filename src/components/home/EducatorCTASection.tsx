'use client';

import { Box, Container, Typography, Grid, Card, CardContent, Button } from '@mui/material';
import { GraduationCap, MailOpen, Star, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const FEATURES = [
  {
    id: 1,
    title: 'أنشئ ملفًا احترافيًا',
    icon: <GraduationCap size={40} />,
    color: '#e3f2fd',
    iconColor: '#2196f3'
  },
  {
    id: 2,
    title: 'استقبل طلبات جديدة باستمرار',
    icon: <MailOpen size={40} />,
    color: '#e8f5e9',
    iconColor: '#4caf50'
  },
  {
    id: 3,
    title: 'ابنِ سمعتك من خلال التقييمات',
    icon: <Star size={40} />,
    color: '#fff8e1',
    iconColor: '#ffc107'
  },
  {
    id: 4,
    title: 'التسجيل مجاني دائمًا',
    icon: <CheckCircle2 size={40} />,
    color: '#fce4ec',
    iconColor: '#e91e63'
  }
];

function FadeInCard({ children, delay }: { children: React.ReactNode, delay: number }) {
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
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={ref}
      sx={{
        height: '100%',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`
      }}
    >
      {children}
    </Box>
  );
}

export default function EducatorCTASection() {
  return (
    <Box sx={{ py: 12, bgcolor: 'primary.main', color: 'white', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative Background Elements */}
      <Box sx={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: '50%', bgcolor: 'primary.light', opacity: 0.2 }} />
      <Box sx={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, borderRadius: '50%', bgcolor: 'primary.dark', opacity: 0.3 }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            👩‍🏫 هل أنت متخصص تعليمي؟
          </Typography>
          <Typography variant="h6" sx={{ maxWidth: 800, mx: 'auto', opacity: 0.9 }}>
            انضم إلى منصة نبني وأنشئ ملفك الاحترافي مجانًا، وابدأ في الوصول إلى أولياء الأمور الباحثين عن خدماتك التعليمية.
          </Typography>
        </Box>

        <Grid container spacing={4} sx={{ mb: 8 }}>
          {FEATURES.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={feature.id}>
              <FadeInCard delay={index * 150}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    borderRadius: 4, 
                    bgcolor: 'white',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      '& .icon-wrapper': { transform: 'scale(1.1)' }
                    }
                  }}
                >
                  <CardContent sx={{ p: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box 
                      className="icon-wrapper"
                      sx={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: '50%', 
                        bgcolor: feature.color, 
                        color: feature.iconColor,
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        mb: 3,
                        transition: 'transform 0.3s ease'
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" color="text.primary" fontWeight="bold">
                      {feature.title}
                    </Typography>
                  </CardContent>
                </Card>
              </FadeInCard>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button 
            component={Link} 
            href="/register?role=educator" 
            variant="contained" 
            size="large"
            sx={{ 
              bgcolor: 'white', 
              color: 'primary.main', 
              px: 6, 
              py: 1.5, 
              borderRadius: 8, 
              fontSize: '1.2rem',
              fontWeight: 'bold',
              '&:hover': { bgcolor: 'grey.100' }
            }}
          >
            سجل كمتخصص الآن
          </Button>
          <Button 
            component={Link} 
            href="/about" 
            variant="outlined" 
            size="large"
            sx={{ 
              borderColor: 'white', 
              color: 'white', 
              px: 4, 
              py: 1.5, 
              borderRadius: 8, 
              fontSize: '1.1rem',
              borderWidth: '2px',
              '&:hover': { borderWidth: '2px', borderColor: 'grey.200', color: 'grey.200' }
            }}
          >
            تعرف على كيفية عمل المنصة
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
