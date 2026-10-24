'use client';

import { Box, Pagination, Typography } from '@mui/material';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export default function AdminPagination({ total, pageSize }: { total: number; pageSize: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pageCount, Math.max(1, Number(searchParams.get('page')) || 1));

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mt: 3 }}>
      <Typography variant="body2" color="text.secondary">الإجمالي: {total}</Typography>
      {pageCount > 1 && (
        <Pagination
          count={pageCount}
          page={page}
          color="primary"
          onChange={(_, next) => {
            const params = new URLSearchParams(searchParams.toString());
            if (next > 1) params.set('page', String(next));
            else params.delete('page');
            router.push(`${pathname}?${params.toString()}`);
          }}
        />
      )}
    </Box>
  );
}
