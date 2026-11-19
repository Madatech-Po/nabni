import { Box, Container, Grid, Paper, Typography } from '@mui/material';
import { GraduationCap, FileText, MapPin, Handshake } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PublicHomeStats } from '@/types/database';

interface StatCard {
  key: keyof PublicHomeStats;
  icon: ReactNode;
  label: string;
  color: string;
}

// Real counts from public_home_stats() (NAB-123). It is a pilot, so the numbers are small:
// they are shown as they are, without "+" or rounding up.
const CARDS: StatCard[] = [
  { key: 'verified_active_educators', icon: <GraduationCap size={40} color="#4dabf5" />, label: 'متخصص موثّق على نبني', color: '#e3f2fd' },
  { key: 'open_requests', icon: <FileText size={40} color="#ffb74d" />, label: 'طلب مفتوح الآن', color: '#fff3e0' },
  { key: 'governorates_covered', icon: <MapPin size={40} color="#81c784" />, label: 'محافظة يعمل فيها متخصصونا', color: '#e8f5e9' },
  { key: 'accepted_offers_total', icon: <Handshake size={40} color="#ba68c8" />, label: 'اتفاق تم بين ولي أمر ومتخصص', color: '#f3e5f5' },
];

export default function StatsSection({ stats }: { stats: PublicHomeStats | null }) {
  // No numbers (the call failed): hide the section rather than show invented ones.
  if (!stats) return null;

  // A zero says nothing useful to a visitor, so only counts above zero get a card.
  const cards = CARDS.filter((card) => stats[card.key] > 0);
  if (cards.length === 0) return null;

  return (
    <Box component="section" aria-label="نبني بالأرقام" sx={{ py: 8, bgcolor: 'common.white' }}>
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="center">
          {cards.map((card) => (
            <Grid item xs={12} sm={6} md={3} key={card.key}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  borderRadius: 4,
                  bgcolor: card.color,
                  height: '100%',
                  transition: 'transform 0.3s ease',
                  '&:hover': { transform: 'translateY(-5px)' },
                }}
              >
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>{card.icon}</Box>
                <Typography variant="h3" fontWeight="bold" color="text.primary" gutterBottom>
                  {stats[card.key].toLocaleString('ar-EG')}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  {card.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
