'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Container, Typography, Grid, Card, CardContent, Button } from '@mui/material';
import { Search, MessageSquare, Handshake } from 'lucide-react';
import Link from 'next/link';

const STEPS = [
  {
    num: 1,
    title: 'ابحث أو أنشئ طلبًا',
    description: 'استعرض المتخصصين أو أنشئ طلباً يوضح احتياجات طفلك التعليمية.',
    icon: <Search size={48} />,
    color: '#e3f2fd', // pastel blue
    iconColor: '#2196f3'
  },
  {
    num: 2,
    title: 'استقبل العروض',
    description: 'سيقوم المتخصصون المناسبون بإرسال عروضهم مع نبذة عن خبراتهم وأسعارهم.',
    icon: <MessageSquare size={48} />,
    color: '#f3e5f5', // pastel purple
    iconColor: '#9c27b0'
  },
  {
    num: 3,
    title: 'اختر وابدأ التعلم',
    description: 'اختر أفضل متخصص، وافتح بيانات التواصل لبدء رحلة التعلم.',
    icon: <Handshake size={48} />,
    color: '#e8f5e9', // pastel green
    iconColor: '#4caf50'
  }
];

// Reusable Fade-In Wrapper
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
      { threshold: 0.1, rootMargin: '50px' }
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
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`
      }}
    >
      {children}
    </Box>
  );
}

export default function HowItWorksSection() {
  return (
    <Box sx={{ py: 12, bgcolor: 'grey.50', overflow: 'hidden' }}>
      <Container maxWidth="lg">
        
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 10 }}>
          <Typography variant="h3" color="primary" fontWeight="bold" gutterBottom>
            كيف تعمل منصة نبني؟
          </Typography>
          <Typography variant="h6" color="text.secondary">
            ابدأ رحلة طفلك التعليمية في ثلاث خطوات بسيطة.
          </Typography>
        </Box>

        {/* Timeline Flow */}
        <Box sx={{ position: 'relative' }}>
          
          {/* Subtle curved connecting line (Visible only on Desktop md and up) */}
          <Box 
            sx={{ 
              display: { xs: 'none', md: 'block' },
              position: 'absolute',
              top: '120px', // Align with the center of the icons
              left: '15%',
              right: '15%',
              height: 2,
              borderBottom: '3px dashed #e0e0e0',
              zIndex: 0
            }}
          />

          <Grid container spacing={6} sx={{ position: 'relative', zIndex: 1 }}>
            {STEPS.map((step, index) => (
              <Grid item xs={12} md={4} key={step.num}>
                <FadeInCard delay={index * 200}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      borderRadius: '24px',
                      background: `linear-gradient(135deg, #ffffff 0%, ${step.color}33 100%)`, // highly subtle pastel gradient
                      boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                      textAlign: 'center',
                      position: 'relative',
                      overflow: 'visible', // To allow the top badge to break out if needed
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-10px)',
                        boxShadow: '0 16px 32px rgba(0,0,0,0.1)',
                        '& .icon-container': { transform: 'scale(1.1)' }
                      }
                    }}
                  >
                    <CardContent sx={{ p: 5, pt: 6 }}>
                      {/* Step Number Badge */}
                      <Box 
                        sx={{
                          position: 'absolute',
                          top: -20,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontWeight: 'bold',
                          color: step.iconColor,
                          fontSize: '1.2rem'
                        }}
                      >
                        {step.num}
                      </Box>

                      {/* Icon Container */}
                      <Box 
                        className="icon-container"
                        sx={{ 
                          width: 100, 
                          height: 100, 
                          borderRadius: '50%', 
                          bgcolor: step.color,
                          color: step.iconColor,
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 4,
                          transition: 'transform 0.3s ease'
                        }}
                      >
                        {step.icon}
                      </Box>

                      <Typography variant="h5" fontWeight="bold" color="text.primary" gutterBottom>
                        {step.title}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                        {step.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </FadeInCard>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Bottom CTA */}
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Button 
            component={Link} 
            href="/register" 
            variant="contained" 
            size="large" 
            sx={{ px: 8, py: 2, borderRadius: 8, fontSize: '1.2rem', boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }}
          >
            ابدأ الآن
          </Button>
        </Box>

      </Container>
    </Box>
  );
}
