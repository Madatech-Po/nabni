'use client';

import { useState, useCallback, useEffect } from 'react';
import { Box, Container, Typography, Card, CardContent, Avatar, Button, IconButton, Chip, Stack } from '@mui/material';
import { MapPin, Briefcase, ChevronRight, ChevronLeft, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import type { EducatorDirectoryItem } from '@/services/tutors';
import { getInitial } from '@/utils/initials';

type EmblaApi = NonNullable<UseEmblaCarouselType[1]>;

/** Fewer real educators than this and the carousel would look empty, so the section shows an invite. */
export const MIN_FEATURED_EDUCATORS = 3;

// Real verified educators from the public directory (NAB-123); the home page fetches them on the
// server. There are no ratings yet, so the cards show no stars or review counts.
export default function FeaturedEducators({ educators }: { educators: EducatorDirectoryItem[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, direction: 'rtl', align: 'start' },
    [Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onInit = useCallback((api: EmblaApi) => {
    setScrollSnaps(api.scrollSnapList());
  }, []);

  const onSelect = useCallback((api: EmblaApi) => {
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onInit(emblaApi);
    onSelect(emblaApi);
    emblaApi.on('reInit', onInit);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
  }, [emblaApi, onInit, onSelect]);

  if (educators.length < MIN_FEATURED_EDUCATORS) {
    return (
      <Box component="section" aria-label="انضم كمتخصص" sx={{ py: 8, bgcolor: 'grey.50', textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h4" color="primary" fontWeight="bold" gutterBottom>
            انضم كمتخصص
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            نبني في بدايتها، ونرحب بالمتخصصين الأوائل. سجّل وأنشئ ملفك ليصلك أولياء الأمور.
          </Typography>
          <Button component={Link} href="/register?role=educator" variant="contained" size="large" sx={{ borderRadius: 8, px: 5 }}>
            سجّل كمتخصص
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box component="section" aria-label="متخصصون موثّقون" sx={{ py: 10, bgcolor: 'grey.50', overflow: 'hidden' }}>
      <Container maxWidth="lg">

        {/* Section Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 6, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h3" color="primary" fontWeight="bold" gutterBottom>
              متخصصون موثّقون على نبني
            </Typography>
            <Typography variant="h6" color="text.secondary">
              تعرّف على بعض المتخصصين الذين راجع فريق نبني بياناتهم.
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
              {educators.map((educator) => {
                const fullName = educator.full_name || 'متخصص نبني';
                return (
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

                        {/* Avatar; everyone in the directory is verified */}
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                          <Box sx={{ position: 'relative' }}>
                            <Avatar
                              className="card-avatar"
                              src={educator.profile_image || undefined}
                              alt={fullName}
                              sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '1.75rem', transition: 'transform 0.25s ease', border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                            >
                              {getInitial(fullName)}
                            </Avatar>
                            <Box sx={{ position: 'absolute', bottom: 0, left: 0, bgcolor: 'white', borderRadius: '50%', display: 'flex' }} title="موثّق">
                              <BadgeCheck size={24} color="#10b981" fill="white" aria-label="موثّق" />
                            </Box>
                          </Box>
                        </Box>

                        {/* Header Info */}
                        <Typography variant="h6" fontWeight="bold" align="center" gutterBottom>
                          {fullName}
                        </Typography>

                        <Stack direction="row" spacing={2} justifyContent="center" mt={2} mb={2} flexWrap="wrap">
                          {educator.governorate_name_ar && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <MapPin size={16} color="#757575" />
                              <Typography variant="caption" color="text.secondary">{educator.governorate_name_ar}</Typography>
                            </Box>
                          )}
                          {educator.experience_years != null && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Briefcase size={16} color="#757575" />
                              <Typography variant="caption" color="text.secondary">{educator.experience_years} سنوات خبرة</Typography>
                            </Box>
                          )}
                        </Stack>

                        {/* Services Chips */}
                        {educator.subjects.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 3 }}>
                            {educator.subjects.slice(0, 3).map((subject) => (
                              <Chip key={subject.id} label={subject.name_ar} size="small" sx={{ bgcolor: 'primary.50', color: 'primary.main', fontWeight: 500 }} />
                            ))}
                          </Box>
                        )}

                        {/* Bio */}
                        {educator.bio && (
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
                        )}
                      </CardContent>
                    </Card>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Navigation Arrows (Hidden on mobile for swipe focus) */}
          <IconButton
            onClick={scrollPrev}
            aria-label="السابق"
            sx={{ position: 'absolute', top: '50%', right: -20, transform: 'translateY(-50%)', bgcolor: 'white', boxShadow: 2, display: { xs: 'none', md: 'flex' }, '&:hover': { bgcolor: 'grey.100' } }}
          >
            <ChevronRight />
          </IconButton>
          <IconButton
            onClick={scrollNext}
            aria-label="التالي"
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
