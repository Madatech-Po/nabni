'use client';

import { Box, Container, Typography, Grid, Card, CardContent } from '@mui/material';
import { BookOpen, Languages, Calculator, Speech, Puzzle, Palette, BookText, Brain, Hand, Smile, GraduationCap } from 'lucide-react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { ServiceCategory } from '@/services/lookups';

interface CategoryLook {
  description?: string;
  icon: ReactNode;
  color: string;
  iconColor: string;
}

// How each service looks on the home page, keyed by its slug in service_categories (NAB-129).
// A service added later without an entry here gets DEFAULT_LOOK.
const LOOK_BY_SLUG: Record<string, CategoryLook> = {
  'arabic-foundation': { description: 'أسس طفلك في القراءة والكتابة', icon: <BookOpen size={40} />, color: '#e3f2fd', iconColor: '#2196f3' },
  'english-foundation': { description: 'مهارات اللغة الإنجليزية الأساسية', icon: <Languages size={40} />, color: '#e8f5e9', iconColor: '#4caf50' },
  mathematics: { description: 'تبسيط المفاهيم الرياضية', icon: <Calculator size={40} />, color: '#fff3e0', iconColor: '#ff9800' },
  'speech-therapy': { description: 'علاج تأخر النطق وصعوبات الكلام', icon: <Speech size={40} />, color: '#fce4ec', iconColor: '#e91e63' },
  'learning-difficulties': { description: 'متخصصون في التعامل مع صعوبات التعلم', icon: <Puzzle size={40} />, color: '#f3e5f5', iconColor: '#9c27b0' },
  montessori: { description: 'التعلم من خلال أنشطة المونتيسوري', icon: <Palette size={40} />, color: '#e0f7fa', iconColor: '#00bcd4' },
  quran: { description: 'تحفيظ وتجويد القرآن الكريم للأطفال', icon: <BookText size={40} />, color: '#f1f8e9', iconColor: '#8bc34a' },
  'skills-development': { description: 'تطوير المهارات الذهنية والحركية', icon: <Brain size={40} />, color: '#fff8e1', iconColor: '#ffc107' },
  'occupational-therapy': { description: 'المهارات الحركية الدقيقة والاعتماد على النفس', icon: <Hand size={40} />, color: '#ede7f6', iconColor: '#673ab7' },
  'behavior-modification': { description: 'تعديل السلوك وتنمية السلوك الإيجابي', icon: <Smile size={40} />, color: '#e8eaf6', iconColor: '#3f51b5' },
};

const DEFAULT_LOOK: CategoryLook = { icon: <GraduationCap size={40} />, color: '#eceff1', iconColor: '#607d8b' };

export function lookForSlug(slug: string): CategoryLook {
  return LOOK_BY_SLUG[slug] ?? DEFAULT_LOOK;
}

export default function CategoriesSection({ categories }: { categories: ServiceCategory[] }) {
  // No services loaded (or the lookup failed): hide the section rather than show dead links.
  if (categories.length === 0) return null;

  return (
    <Box sx={{ py: 10, bgcolor: 'common.white' }}>
      <Container maxWidth="lg">
        {/* Section Header */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" color="primary" fontWeight="bold" gutterBottom>
            🎯 اكتشف الخدمات التعليمية المناسبة لطفلك
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
            اختر نوع الخدمة التعليمية التي يحتاجها طفلك واستعرض أفضل المتخصصين في كل مجال.
          </Typography>
        </Box>

        {/* Categories Grid */}
        <Grid container spacing={4}>
          {categories.map((category) => {
            const cat = lookForSlug(category.slug);
            return (
              <Grid item xs={12} sm={6} md={3} key={category.id}>
                <Link href={`/educators?subject=${category.id}`} style={{ textDecoration: 'none' }}>
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: 4,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                        '& .cat-icon': { transform: 'scale(1.1)' }
                      }
                    }}
                  >
                    <CardContent sx={{ p: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {/* Icon Illustration */}
                      <Box
                        className="cat-icon"
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          bgcolor: cat.color,
                          color: cat.iconColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 3,
                          transition: 'transform 0.3s ease'
                        }}
                      >
                        {cat.icon}
                      </Box>

                      <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                        {category.name_ar}
                      </Typography>
                    
                      {cat.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                          {cat.description}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}
