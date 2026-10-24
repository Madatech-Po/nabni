import { Suspense } from 'react';
import Link from 'next/link';
import {
  Box, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { ADMIN_LOG_ACTIONS, ADMIN_PAGE_SIZE, getAdminLogs, type AdminLogAction } from '@/services/admin';
import AdminListFilters from '@/components/admin/AdminListFilters';
import AdminPagination from '@/components/admin/AdminPagination';
import { ACTION_LABELS, describeChange, targetHref } from '@/components/admin/adminLogFormat';

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: { action?: string; page?: string };
}) {
  const action = ADMIN_LOG_ACTIONS.includes(searchParams.action as AdminLogAction)
    ? (searchParams.action as AdminLogAction)
    : undefined;
  const { items, total } = await getAdminLogs({ action, page: Number(searchParams.page) || 1 });

  return (
    <>
      <Typography variant="h4" component="h1" fontWeight="bold" color="primary" gutterBottom>
        سجل الإجراءات
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        كل إجراء إداري يُسجل هنا تلقائياً ولا يمكن تعديله أو حذفه.
      </Typography>

      <Suspense>
        <AdminListFilters
          selects={[
            {
              param: 'action',
              label: 'نوع الإجراء',
              defaultValue: 'all',
              options: [
                { value: 'all', label: 'الكل' },
                ...ADMIN_LOG_ACTIONS.map((a) => ({ value: a, label: ACTION_LABELS[a] })),
              ],
            },
          ]}
        />
      </Suspense>

      {items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">لا توجد إجراءات مسجلة.</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table sx={{ minWidth: 820 }}>
            <TableHead>
              <TableRow>
                <TableCell>الوقت</TableCell>
                <TableCell>المسؤول</TableCell>
                <TableCell>الإجراء</TableCell>
                <TableCell>على</TableCell>
                <TableCell>التغيير</TableCell>
                <TableCell>السبب</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => {
                const href = targetHref(item);
                const label = item.target_label
                  ? item.target_label.length > 60 ? `${item.target_label.slice(0, 60)}…` : item.target_label
                  : 'محذوف';
                return (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(item.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell>{item.admin?.full_name || '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined" label={ACTION_LABELS[item.action] ?? item.action} />
                    </TableCell>
                    <TableCell>{href ? <Link href={href}>{label}</Link> : label}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{describeChange(item)}</TableCell>
                    <TableCell>{item.details.reason || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Suspense>
        <AdminPagination total={total} pageSize={ADMIN_PAGE_SIZE} />
      </Suspense>
    </>
  );
}
