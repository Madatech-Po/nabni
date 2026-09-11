'use client';

import { useEffect, useState, useRef } from 'react';
import { Box, Container, Grid, Paper, Typography } from '@mui/material';
import { Users, GraduationCap, FileText, Star } from 'lucide-react';

interface AnimatedCounterProps {
  end: number;
  suffix?: string;
}

function AnimatedCounter({ end, suffix = '' }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

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

    if (elementRef.current) observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    
    let startTime: number;
    const duration = 2000; // 2 seconds

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function: easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentCount = Number((easeProgress * end).toFixed(end % 1 !== 0 ? 1 : 0));
      
      setCount(currentCount);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [end, isVisible]);

  return <span ref={elementRef}>{count}{suffix}</span>;
}

const stats = [
  { icon: <GraduationCap size={40} color="#4dabf5" />, value: 850, suffix: '+', label: 'متخصص تعليمي', color: '#e3f2fd' },
  { icon: <Users size={40} color="#81c784" />, value: 2400, suffix: '+', label: 'ولي أمر', color: '#e8f5e9' },
  { icon: <FileText size={40} color="#ffb74d" />, value: 1750, suffix: '+', label: 'طلب تعليمي', color: '#fff3e0' },
  { icon: <Star size={40} color="#ba68c8" />, value: 4.9, suffix: '', label: 'متوسط التقييم', color: '#f3e5f5' },
];

export default function StatsSection() {
  return (
    <Box sx={{ py: 8, bgcolor: 'common.white' }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 4, 
                  textAlign: 'center', 
                  borderRadius: 4, 
                  bgcolor: stat.color,
                  transition: 'transform 0.3s ease',
                  '&:hover': { transform: 'translateY(-5px)' }
                }}
              >
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                  {stat.icon}
                </Box>
                <Typography variant="h3" fontWeight="bold" color="text.primary" gutterBottom>
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  {stat.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
