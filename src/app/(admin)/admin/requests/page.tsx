import { Suspense } from 'react';
import Link from 'next/link';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { ADMIN_PAGE_SIZE, getRequestsForAdmin, REQUEST_STATUSES } from '@/services/admin';
import { getGovernorates, getServiceCategories } from '@/services/lookups';
import AdminListFilters from '@/components/admin/AdminListFilters';
import AdminPagination from '@/components/admin/AdminPagination';
import RequestModerationActions from '@/components/admin/RequestModerationActions';
import { REQUEST_STATUS_COLORS, REQUEST_STATUS_LABELS } from '@/components/admin/requestStatus';
import type { RequestStatus } from '@/types/database';

const ALL = { value: 'all', label: 'الكل' };

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: { status?: string; service?: string; governorate?: string; parent?: string; q?: string; page?: string };
}) {
  const status = REQUEST_STATUSES.includes(searchParams.status as RequestStatus)
    ? (searchParams.status as RequestStatus)
    : undefined;

  const [{ items, total }, services, governorates] = await Promise.all([
    getRequestsForAdmin({
      status,
      serviceCategoryId: Number(searchParams.service) || undefined,
      governorateId: Number(searchParams.governorate) || undefined,
      parentId: searchParams.parent,
      q: searchParams.q,
      page: Number(searchParams.page) || 1,
    }),
    getServiceCategories(),
    getGovernorates(),
  ]);

  const parentName = searchParams.parent ? items[0]?.parent?.full_name : undefined;

  return (
    <>
      <Typography variant="h4" component="h1" fontWeight="bold" color="primary" gutterBottom>
        الطلبات
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        الطلبات المخفية لا تظهر للزوار، ويراها ولي الأمر على أنها مخفية ولا يستطيع تعديلها.
      </Typography>

      {searchParams.parent && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 3 }}>
          <Typography fontWeight="bold">طلبات ولي الأمر: {parentName || 'غير معروف'}</Typography>
          <Link href="/admin/requests">عرض كل الطلبات</Link>
        </Box>
      )}

      <Suspense>
        <AdminListFilters
          selects={[
            {
              param: 'status',
              label: 'الحالة',
              defaultValue: 'all',
              options: [ALL, ...REQUEST_STATUSES.map((s) => ({ value: s, label: REQUEST_STATUS_LABELS[s] }))],
            },
            {
              param: 'service',
              label: 'الخدمة',
              defaultValue: 'all',
              options: [ALL, ...services.map((s) => ({ value: String(s.id), label: s.name_ar }))],
            },
            {
              param: 'governorate',
              label: 'المحافظة',
              defaultValue: 'all',
              options: [ALL, ...governorates.map((g) => ({ value: String(g.id), label: g.name_ar }))],
            },
          ]}
          searchLabel="بحث في وصف الطلب"
        />
      </Suspense>

      {items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">لا توجد طلبات مطابقة.</Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {items.map((request) => (
            <Paper key={request.id} variant="outlined" sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                <Chip
                  size="small"
                  label={REQUEST_STATUS_LABELS[request.status]}
                  color={REQUEST_STATUS_COLORS[request.status]}
                />
                {request.service_category && <Chip size="small" variant="outlined" label={request.service_category.name_ar} />}
                {request.governorate && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={[request.governorate.name_ar, request.area].filter(Boolean).join(' - ')}
                  />
                )}
              </Box>

              <Typography variant="body1" sx={{ mb: 1.5, whiteSpace: 'pre-line' }}>{request.description}</Typography>

              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', color: 'text.secondary', mb: 2 }}>
                <Typography variant="body2">
                  ولي الأمر: {request.parent?.full_name || '—'}
                  {request.parent?.phone && <span dir="ltr"> ({request.parent.phone})</span>}
                  {request.parent && !request.parent.is_active && (
                    <Chip size="small" label="حساب موقوف" sx={{ mx: 1 }} />
                  )}
                </Typography>
                <Typography variant="body2">عمر الطفل: {request.student_age} سنوات</Typography>
                <Typography variant="body2">
                  الميزانية:{' '}
                  {request.budget
                    ? `${request.budget} ج.م${request.pricing_unit ? ` / ${request.pricing_unit.name_ar}` : ''}`
                    : 'قابل للتفاوض'}
                </Typography>
                <Typography variant="body2">{new Date(request.created_at).toLocaleDateString('ar-EG')}</Typography>
              </Box>

              <RequestModerationActions requestId={request.id} status={request.status} />
            </Paper>
          ))}
        </Stack>
      )}

      <Suspense>
        <AdminPagination total={total} pageSize={ADMIN_PAGE_SIZE} />
      </Suspense>
    </>
  );
}
