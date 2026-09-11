'use client';

import { Box, Container, Typography, Button, TextField, InputAdornment, Grid, Chip } from '@mui/material';
import { Search, PlusCircle, CheckCircle, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function HeroSection() {
  return (
    <Box sx={{ bgcolor: 'background.default', py: { xs: 8, md: 12 }, overflow: 'hidden' }}>
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ pr: { md: 4 } }}>
              <Typography 
                variant="h2" 
                component="h1" 
                fontWeight="900" 
                color="primary.main" 
                gutterBottom
                sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' }, lineHeight: 1.2 }}
              >
                نبني... خطوة طفلك الأولى نحو التعلم.
              </Typography>
              <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 4, fontWeight: 400 }}>
                سواء كنت ولي أمر يبحث عن أفضل متخصص لطفله، أو متخصصًا تعليميًا يرغب في الوصول إلى المزيد من أولياء الأمور، فإن نبني تجمعكم في منصة واحدة سهلة وآمنة.
              </Typography>

              <Box sx={{ mb: 4 }}>
                <TextField
                  fullWidth
                  placeholder="ابحث عن متخصص، مادة، أو محافظة..."
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="#9e9e9e" />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: '50px', bgcolor: 'background.paper', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, width: '100%', mb: 4 }}>
                <Button 
                  component={Link} 
                  href="/educators" 
                  variant="contained" 
                  size="large" 
                  startIcon={<Search size={20} />}
                  sx={{ flex: 1, borderRadius: '50px', py: 1.5, fontSize: '1.1rem', border: '2px solid transparent', whiteSpace: 'nowrap' }}
                >
                  ابحث عن متخصص
                </Button>
                <Button 
                  component={Link} 
                  href="/requests/new" 
                  variant="outlined" 
                  size="large"
                  startIcon={<PlusCircle size={20} />}
                  sx={{ flex: 1, borderRadius: '50px', py: 1.5, fontSize: '1.1rem', borderWidth: '2px', '&:hover': { borderWidth: '2px' }, whiteSpace: 'nowrap' }}
                >
                  أنشئ طلبًا
                </Button>
                <Button 
                  component={Link} 
                  href="/register?role=educator" 
                  variant="contained" 
                  color="secondary"
                  size="large"
                  startIcon={<GraduationCap size={20} />}
                  sx={{ 
                    flex: 1,
                    borderRadius: '50px', 
                    py: 1.5, 
                    fontSize: '1.1rem',
                    border: '2px solid transparent',
                    bgcolor: 'primary.dark',
                    color: 'white',
                    whiteSpace: 'nowrap',
                    '&:hover': { bgcolor: 'primary.main', border: '2px solid transparent' }
                  }}
                >
                  انضم كمتخصص
                </Button>
              </Box>

            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ position: 'relative', height: { xs: 300, md: 500 }, width: '100%', borderRadius: 8, overflow: 'hidden' }}>
              <Image 
                src="/images/hero_natural.jpg" 
                alt="طفل يتعلم مع معلم" 
                fill 
                style={{ objectFit: 'cover' }}
                priority
              />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
