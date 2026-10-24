import { Suspense } from 'react';
import Link from 'next/link';
import {
  Box, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { ADMIN_PAGE_SIZE, getParentsForAdmin } from '@/services/admin';
import AdminListFilters from '@/components/admin/AdminListFilters';
import AdminPagination from '@/components/admin/AdminPagination';
import ParentAccountActions from '@/components/admin/ParentAccountActions';
import { formatDate } from '@/utils/formatDate';

const STATUS_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'active', label: 'نشط' },
  { value: 'suspended', label: 'موقوف' },
];

export default async function AdminParentsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; page?: string };
}) {
  const active = searchParams.status === 'active' ? true : searchParams.status === 'suspended' ? false : undefined;
  const { items, total } = await getParentsForAdmin({
    active,
    q: searchParams.q,
    page: Number(searchParams.page) || 1,
  });

  return (
    <>
      <Typography variant="h4" component="h1" fontWeight="bold" color="primary" gutterBottom>
        أولياء الأمور
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        الحسابات الموقوفة لا تستطيع نشر الطلبات، وتختفي طلباتها المفتوحة من صفحة الطلبات.
      </Typography>

      <Suspense>
        <AdminListFilters
          selects={[{ param: 'status', label: 'الحالة', defaultValue: 'all', options: STATUS_OPTIONS }]}
          searchLabel="بحث بالاسم أو رقم الهاتف"
        />
      </Suspense>

      {items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">لا يوجد أولياء أمور مطابقون.</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>الاسم</TableCell>
                <TableCell>الهاتف</TableCell>
                <TableCell>المحافظة</TableCell>
                <TableCell>تاريخ التسجيل</TableCell>
                <TableCell>الطلبات</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الإجراء</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((parent) => {
                const requestCount = parent.requests[0]?.count ?? 0;
                return (
                  <TableRow key={parent.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{parent.full_name || '—'}</TableCell>
                    <TableCell dir="ltr" sx={{ textAlign: 'right' }}>{parent.phone || '—'}</TableCell>
                    <TableCell>{parent.governorate?.name_ar || '—'}</TableCell>
                    <TableCell>{formatDate(parent.created_at)}</TableCell>
                    <TableCell>
                      {requestCount > 0 ? (
                        <Link href={`/admin/requests?parent=${parent.id}`}>{requestCount} طلب</Link>
                      ) : (
                        '0'
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={parent.is_active ? 'نشط' : 'موقوف'}
                        color={parent.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <ParentAccountActions userId={parent.id} active={parent.is_active} />
                    </TableCell>
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
