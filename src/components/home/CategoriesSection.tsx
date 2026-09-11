'use client';

import { Box, Container, Typography, Grid, Card, CardContent } from '@mui/material';
import { BookOpen, Languages, Calculator, Speech, Puzzle, Palette, BookText, Brain } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  { id: 'arabic', title: 'تأسيس لغة عربية', description: 'أسس طفلك في القراءة والكتابة', count: 42, icon: <BookOpen size={40} />, color: '#e3f2fd', iconColor: '#2196f3' },
  { id: 'english', title: 'تأسيس لغة إنجليزية', description: 'مهارات اللغة الإنجليزية الأساسية', count: 67, icon: <Languages size={40} />, color: '#e8f5e9', iconColor: '#4caf50' },
  { id: 'math', title: 'رياضيات', description: 'تبسيط المفاهيم الرياضية', count: 35, icon: <Calculator size={40} />, color: '#fff3e0', iconColor: '#ff9800' },
  { id: 'speech', title: 'تخاطب', description: 'علاج تأخر النطق وصعوبات الكلام', count: 18, icon: <Speech size={40} />, color: '#fce4ec', iconColor: '#e91e63' },
  { id: 'learning-difficulties', title: 'صعوبات تعلم', description: 'متخصصون في التعامل مع صعوبات التعلم', count: 24, icon: <Puzzle size={40} />, color: '#f3e5f5', iconColor: '#9c27b0' },
  { id: 'montessori', title: 'مونتيسوري', description: 'التعلم من خلال أنشطة المونتيسوري', count: 12, icon: <Palette size={40} />, color: '#e0f7fa', iconColor: '#00bcd4' },
  { id: 'quran', title: 'تحفيظ القرآن الكريم', description: 'تحفيظ وتجويد القرآن الكريم للأطفال', count: 55, icon: <BookText size={40} />, color: '#f1f8e9', iconColor: '#8bc34a' },
  { id: 'skills', title: 'تنمية المهارات', description: 'تطوير المهارات الذهنية والحركية', count: 29, icon: <Brain size={40} />, color: '#fff8e1', iconColor: '#ffc107' },
];

export default function CategoriesSection() {
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
          {CATEGORIES.map((cat) => (
            <Grid item xs={12} sm={6} md={3} key={cat.id}>
              <Link href={`/educators?category=${cat.id}`} style={{ textDecoration: 'none' }}>
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
                      {cat.title}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                      {cat.description}
                    </Typography>

                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main', bgcolor: 'primary.50', px: 2, py: 0.5, borderRadius: 4 }}>
                      {cat.count} متخصص
                    </Typography>
                  </CardContent>
                </Card>
              </Link>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
