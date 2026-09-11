'use client';

import { useState, useCallback, useEffect } from 'react';
import { Box, Container, Typography, Card, CardContent, Avatar, Button, IconButton, Chip, Stack } from '@mui/material';
import { MapPin, Briefcase, ChevronRight, ChevronLeft, Heart, Star, BadgeCheck, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

// Detailed placeholder data matching future Supabase schema
const MOCK_EDUCATORS = Array.from({ length: 8 }).map((_, i) => ({
  id: i + 1,
  profile_image: `https://i.pravatar.cc/150?u=${i + 10}`,
  name: i % 2 === 0 ? 'أحمد محمد' : 'سارة محمود',
  specialization: i % 3 === 0 ? 'أخصائي تخاطب' : (i % 2 === 0 ? 'معلم تأسيس' : 'مدرب مونتيسوري'),
  governorate: i % 4 === 0 ? 'الإسكندرية' : 'القاهرة',
  rating: 4.8 + (i % 3) * 0.1,
  reviews_count: 120 + (i * 15),
  years_experience: 5 + i,
  services: i % 2 === 0 ? ['تأسيس', 'لغة عربية'] : ['مونتيسوري', 'رياضيات', 'لغة إنجليزية'],
  children_helped: 150 + (i * 30),
  bio: 'متخصص في تأسيس الأطفال باستخدام أحدث الأساليب التفاعلية لضمان بيئة ممتعة وفعالة للتعلم.',
  verified: i % 2 === 0
}));

export default function FeaturedEducators() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, direction: 'rtl', align: 'start' },
    [Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onInit = useCallback((emblaApi: any) => {
    setScrollSnaps(emblaApi.scrollSnapList());
  }, []);

  const onSelect = useCallback((emblaApi: any) => {
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onInit(emblaApi);
    onSelect(emblaApi);
    emblaApi.on('reInit', onInit);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
  }, [emblaApi, onInit, onSelect]);

  if (MOCK_EDUCATORS.length === 0) {
    return (
      <Box sx={{ py: 10, bgcolor: 'grey.50', textAlign: 'center' }}>
        <Container maxWidth="md">
          <Box sx={{ position: 'relative', height: 250, mb: 4 }}>
             <Image src="/images/empty_educators.jpg" alt="No Educators" fill style={{ objectFit: 'contain' }} />
          </Box>
          <Typography variant="h5" color="text.secondary">
            سيتم إضافة المتخصصين قريباً.
          </Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 10, bgcolor: 'grey.50', overflow: 'hidden' }}>
      <Container maxWidth="lg">
        
        {/* Section Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 6, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h3" color="primary" fontWeight="bold" gutterBottom>
              ⭐ أفضل المتخصصين على نبني
            </Typography>
            <Typography variant="h6" color="text.secondary">
              تعرف على نخبة من المتخصصين الأكثر تقييماً وثقة من أولياء الأمور.
            </Typography>
          </Box>
          <Button component={Link} href="/educators" variant="outlined" size="large" sx={{ borderRadius: 8 }}>
            عرض جميع المتخصصين
          </Button>
        </Box>

        {/* Carousel Container */}
        <Box sx={{ position: 'relative' }}>
          
          <Box className="embla" ref={emblaRef} sx={{ overflow: 'hidden' }}>
            <Box className="embla__container" sx={{ display: 'flex', touchAction: 'pan-y', ml: -3 /* counter offset for RTL gap */ }}>
              {MOCK_EDUCATORS.map((educator) => (
                <Box 
                  key={educator.id} 
                  className="embla__slide" 
                  sx={{ 
                    flex: '0 0 100%', 
                    minWidth: 0, 
                    pl: 3, // This creates the gap between slides
                    '@media (min-width: 600px)': { flex: '0 0 50%' },
                    '@media (min-width: 900px)': { flex: '0 0 25%' }
                  }}
                >
                  <Card 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: '24px',
                      bgcolor: '#fcfcfc', // extremely soft pastel tint
                      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                      transition: 'all 0.25s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                        '& .card-avatar': { transform: 'scale(1.05)' }
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3, flexGrow: 1 }}>
                      
                      {/* Top Right: Rating */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ textAlign: 'right' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#f59e0b' }}>
                            <Typography fontWeight="bold">{educator.rating.toFixed(1)}</Typography>
                            <Star size={16} fill="currentColor" />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            ({educator.reviews_count} تقييم)
                          </Typography>
                        </Box>
                        
                        {/* Avatar */}
                        <Box sx={{ position: 'relative' }}>
                          <Avatar 
                            className="card-avatar"
                            src={educator.profile_image} 
                            sx={{ width: 80, height: 80, transition: 'transform 0.25s ease', border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                          />
                          {educator.verified && (
                            <Box sx={{ position: 'absolute', bottom: 0, left: 0, bgcolor: 'white', borderRadius: '50%' }}>
                              <BadgeCheck size={24} color="#10b981" fill="white" />
                            </Box>
                          )}
                        </Box>
                      </Box>

                      {/* Header Info */}
                      <Typography variant="h6" fontWeight="bold" align="center" gutterBottom>
                        {educator.name}
                      </Typography>
                      <Typography variant="body2" color="primary" fontWeight="medium" align="center" gutterBottom>
                        {educator.specialization}
                      </Typography>

                      <Stack direction="row" spacing={2} justifyContent="center" mt={2} mb={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <MapPin size={16} color="#757575" />
                          <Typography variant="caption" color="text.secondary">{educator.governorate}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Briefcase size={16} color="#757575" />
                          <Typography variant="caption" color="text.secondary">{educator.years_experience} سنوات خبرة</Typography>
                        </Box>
                      </Stack>

                      {/* Services Chips */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 3 }}>
                        {educator.services.slice(0, 3).map((service, idx) => (
                          <Chip key={idx} label={service} size="small" sx={{ bgcolor: 'primary.50', color: 'primary.main', fontWeight: 500 }} />
                        ))}
                      </Box>

                      {/* Social Proof */}
                      <Box sx={{ bgcolor: 'success.50', p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                        <Users size={18} color="#10b981" />
                        <Typography variant="body2" color="success.dark" fontWeight="medium">
                          قام بمساعدة {educator.children_helped}+ طفل
                        </Typography>
                      </Box>

                      {/* Bio */}
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        align="center"
                        sx={{ 
                          display: '-webkit-box', 
                          WebkitLineClamp: 2, 
                          WebkitBoxOrient: 'vertical', 
                          overflow: 'hidden' 
                        }}
                      >
                        {educator.bio}
                      </Typography>
                    </CardContent>

                    {/* Footer Actions */}
                    <Box sx={{ p: 3, pt: 0, display: 'flex', gap: 1 }}>
                      <Button 
                        component={Link} 
                        href={`/educators/${educator.id}`} 
                        variant="contained" 
                        color="primary"
                        sx={{ flexGrow: 1, borderRadius: 8 }}
                      >
                        عرض الملف الشخصي
                      </Button>
                      <IconButton 
                        component={Link}
                        href="/login?redirectTo=/educators"
                        color="primary" 
                        sx={{ border: '1px solid', borderColor: 'divider' }}
                      >
                        <Heart size={20} />
                      </IconButton>
                    </Box>
                  </Card>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Navigation Arrows (Hidden on mobile for swipe focus) */}
          <IconButton 
            onClick={scrollPrev} 
            sx={{ position: 'absolute', top: '50%', right: -20, transform: 'translateY(-50%)', bgcolor: 'white', boxShadow: 2, display: { xs: 'none', md: 'flex' }, '&:hover': { bgcolor: 'grey.100' } }}
          >
            <ChevronRight />
          </IconButton>
          <IconButton 
            onClick={scrollNext} 
            sx={{ position: 'absolute', top: '50%', left: -20, transform: 'translateY(-50%)', bgcolor: 'white', boxShadow: 2, display: { xs: 'none', md: 'flex' }, '&:hover': { bgcolor: 'grey.100' } }}
          >
            <ChevronLeft />
          </IconButton>

        </Box>

        {/* Pagination Dots */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 4 }}>
          {scrollSnaps.map((_, index) => (
            <Box 
              key={index} 
              onClick={() => scrollTo(index)}
              sx={{ 
                width: selectedIndex === index ? 24 : 8, 
                height: 8, 
                borderRadius: 4, 
                bgcolor: selectedIndex === index ? 'primary.main' : 'grey.300',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }} 
            />
          ))}
        </Box>

      </Container>
    </Box>
  );
}
