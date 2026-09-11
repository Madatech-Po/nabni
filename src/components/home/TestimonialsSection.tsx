'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { Box, Container, Typography, Card, CardContent, Avatar, Chip, Button } from '@mui/material';
import { MapPin, Star, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

const MOCK_REVIEWS = [
  {
    id: 1,
    name: 'أحمد محمد',
    location: 'الإسكندرية',
    rating: 5.0,
    review: 'وجدت معلمة تأسيس رائعة لابنتي خلال يوم واحد فقط. كانت عملية البحث سهلة جداً والتواصل تم بكل سهولة.',
    avatar: 'https://i.pravatar.cc/150?u=1'
  },
  {
    id: 2,
    name: 'سارة محمود',
    location: 'القاهرة',
    rating: 5.0,
    review: 'منصة ممتازة وموثوقة. المعلم الذي تعاقدنا معه محترف جداً واستطاع تحسين مستوى ابني في الرياضيات بشكل ملحوظ خلال أسابيع قليلة.',
    avatar: 'https://i.pravatar.cc/150?u=2'
  },
  {
    id: 3,
    name: 'خالد عبد الله',
    location: 'الجيزة',
    rating: 4.9,
    review: 'تجربة رائعة! كنت أبحث عن أخصائي تخاطب ووجدت العديد من الخيارات الممتازة. سهولة المنصة وفرت علي الكثير من الوقت.',
    avatar: 'https://i.pravatar.cc/150?u=3'
  },
  {
    id: 4,
    name: 'مها حسن',
    location: 'المنصورة',
    rating: 5.0,
    review: 'أنصح كل أم باستخدام نبني. فكرة طلب المعلمين رائعة جداً، تلقيت عدة عروض واخترت الأنسب لميزانيتي بكل راحة.',
    avatar: 'https://i.pravatar.cc/150?u=4'
  }
];

// Reusable Fade-In Wrapper
function FadeInView({ children }: { children: React.ReactNode }) {
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
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.8s ease'
      }}
    >
      {children}
    </Box>
  );
}

export default function TestimonialsSection() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, direction: 'rtl', align: 'start' },
    [Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );
  
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  return (
    <Box sx={{ py: 12, bgcolor: 'grey.50' }}>
      <Container maxWidth="lg">
        
        {/* Section Header */}
        <FadeInView>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" color="primary" fontWeight="bold" gutterBottom>
              ❤️ ماذا يقول أولياء الأمور عن نبني؟
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
              تعرف على تجارب أولياء الأمور الذين وجدوا المتخصص المناسب لأطفالهم عبر منصة نبني.
            </Typography>
          </Box>
        </FadeInView>

        {/* Testimonials Carousel */}
        <FadeInView>
          <Box className="embla" ref={emblaRef} sx={{ overflow: 'hidden', py: 2 }}>
            <Box className="embla__container" sx={{ display: 'flex', touchAction: 'pan-y', ml: -3 }}>
              {MOCK_REVIEWS.map((review) => (
                <Box 
                  key={review.id} 
                  className="embla__slide" 
                  sx={{ 
                    flex: '0 0 100%', 
                    minWidth: 0, 
                    pl: 3, 
                    '@media (min-width: 600px)': { flex: '0 0 50%' },
                    '@media (min-width: 900px)': { flex: '0 0 33.333333%' }
                  }}
                >
                  <Card 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: '24px',
                      bgcolor: '#fff', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                      
                      {/* Header */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Avatar src={review.avatar} sx={{ width: 56, height: 56 }} />
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {review.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                              <MapPin size={14} />
                              <Typography variant="caption">{review.location}</Typography>
                            </Box>
                          </Box>
                        </Box>

                        {/* Rating */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', color: '#f59e0b' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Star size={16} fill="currentColor" />
                            <Star size={16} fill="currentColor" />
                            <Star size={16} fill="currentColor" />
                            <Star size={16} fill="currentColor" />
                            <Star size={16} fill="currentColor" />
                          </Box>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 0.5 }}>
                            {review.rating.toFixed(1)}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Review Text */}
                      <Typography 
                        variant="body1" 
                        color="text.primary" 
                        sx={{ 
                          mb: 4,
                          flexGrow: 1,
                          lineHeight: 1.8,
                          display: '-webkit-box',
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        "{review.review}"
                      </Typography>

                      {/* Footer Badge */}
                      <Box sx={{ mt: 'auto' }}>
                        <Chip 
                          icon={<BadgeCheck size={16} />} 
                          label="تم التحقق" 
                          size="small" 
                          sx={{ bgcolor: 'success.50', color: 'success.main', fontWeight: 'bold' }} 
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>
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
        </FadeInView>

        {/* Bottom CTA */}
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Button 
            component={Link} 
            href="/reviews" 
            variant="outlined" 
            size="large" 
            sx={{ px: 6, py: 1.5, borderRadius: 8, fontSize: '1.1rem', borderWidth: '2px', '&:hover': { borderWidth: '2px' } }}
          >
            اقرأ جميع التقييمات
          </Button>
        </Box>

      </Container>
    </Box>
  );
}
