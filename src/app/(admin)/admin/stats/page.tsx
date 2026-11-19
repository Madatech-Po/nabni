import type { ReactNode } from 'react';
import {
  Alert, Box, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { REQUEST_STATUSES, VERIFICATION_STATUSES, getPilotStats } from '@/services/admin';
import type { AdminPilotStats, OfferStatus, StatCount } from '@/types/database';
import { REQUEST_STATUS_LABELS } from '@/components/admin/requestStatus';
import { STATUS_LABELS } from '@/components/admin/verificationStatus';
import { ADMIN_OFFER_STATUS_LABELS, formatHours, formatNumber } from '@/components/admin/pilotStatsFormat';
import { formatDateTime } from '@/utils/formatDate';

const OFFER_STATUSES: OfferStatus[] = ['pending', 'accepted', 'declined', 'withdrawn', 'archived', 'removed'];

function MetricCard({ label, value, note }: { label: string; value: string; note?: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>{label}</Typography>
      <Typography variant="h4" component="p" fontWeight="bold">{value}</Typography>
      {note && <Typography variant="body2" color="text.secondary" mt={1}>{note}</Typography>}
    </Paper>
  );
}

function CountCard({ label, count }: { label: string; count: StatCount }) {
  return (
    <MetricCard label={label} value={formatNumber(count.total)} note={`آخر ٧ أيام: ${formatNumber(count.last_7_days)}`} />
  );
}

function Breakdown({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" aria-label={title}>
        <TableHead>
          <TableRow>
            <TableCell>{title}</TableCell>
            <TableCell align="left">العدد</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell>{row.label}</TableCell>
              <TableCell align="left">{formatNumber(row.value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <Typography variant="h6" component="h2" fontWeight="bold" mt={4} mb={2}>{children}</Typography>;
}

// The pilot numbers in one place (NAB-125). The admin layout already checks the role, and the
// function leaves out e2e accounts and [E2E] rows. Plain cards and tables, no chart library.
export default async function AdminStatsPage() {
  const stats: AdminPilotStats | null = await getPilotStats().catch(() => null);

  return (
    <>
      <Typography variant="h4" component="h1" fontWeight="bold" color="primary" gutterBottom>
        أرقام التجربة
      </Typography>

      {!stats ? (
        <Alert severity="error" sx={{ mt: 2 }}>تعذّر تحميل الأرقام — حدّث الصفحة بعد قليل.</Alert>
      ) : (
        <>
          <Typography variant="body1" color="text.secondary">
            آخر تحديث: {formatDateTime(stats.generated_at)} — حسابات الاختبار وبياناتها غير محسوبة.
          </Typography>

          <SectionTitle>الحسابات</SectionTitle>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}><CountCard label="أولياء الأمور" count={stats.parents} /></Grid>
            <Grid item xs={12} sm={6} md={3}><CountCard label="المتخصصون" count={stats.educators} /></Grid>
            <Grid item xs={12} md={6}>
              <Breakdown
                title="المتخصصون حسب حالة التوثيق"
                rows={VERIFICATION_STATUSES.map((s) => ({ label: STATUS_LABELS[s], value: stats.educators_by_status[s] ?? 0 }))}
              />
            </Grid>
          </Grid>

          <SectionTitle>الطلبات والعروض</SectionTitle>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}><CountCard label="طلبات منشورة" count={stats.requests.posted} /></Grid>
            <Grid item xs={12} sm={6} md={3}><CountCard label="عروض مرسلة" count={stats.offers.sent} /></Grid>
            <Grid item xs={12} sm={6} md={3}><CountCard label="اتفاقات (عروض مقبولة)" count={stats.matches} /></Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                label="متوسط العروض لكل طلب"
                value={formatNumber(stats.avg_offers_per_request)}
                note="للطلبات التي وصلها عرض واحد على الأقل"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                label="الوقت حتى أول عرض (الوسيط)"
                value={formatHours(stats.median_hours_to_first_offer)}
                note="من نشر الطلب إلى أول عرض عليه"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Breakdown
                  title="الطلبات حسب الحالة"
                  rows={REQUEST_STATUSES.map((s) => ({ label: REQUEST_STATUS_LABELS[s], value: stats.requests[s] ?? 0 }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Breakdown
                  title="العروض حسب الحالة"
                  rows={OFFER_STATUSES.map((s) => ({ label: ADMIN_OFFER_STATUS_LABELS[s], value: stats.offers[s] ?? 0 }))}
                />
              </Grid>
            </Grid>
          </Box>
        </>
      )}
    </>
  );
}
