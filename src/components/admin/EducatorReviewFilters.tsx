'use client';

import { useState } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, TextField, Button } from '@mui/material';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { STATUS_LABELS } from './verificationStatus';
import type { EducatorVerificationStatus } from '@/types/database';

const STATUSES = Object.keys(STATUS_LABELS) as EducatorVerificationStatus[];

export default function EducatorReviewFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // No status param means the default "pending" queue; "all" shows every status.
  const currentStatus = searchParams.get('status') || 'pending';
  const [q, setQ] = useState(searchParams.get('q') || '');

  function push(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        push({ q: q.trim() });
      }}
      sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 4 }}
    >
      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel id="status-filter-label">الحالة</InputLabel>
        <Select
          labelId="status-filter-label"
          label="الحالة"
          value={currentStatus}
          onChange={(e: SelectChangeEvent) => push({ status: e.target.value })}
        >
          {STATUSES.map((status) => (
            <MenuItem key={status} value={status}>{STATUS_LABELS[status]}</MenuItem>
          ))}
          <MenuItem value="all">الكل</MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="بحث بالاسم أو رقم الهاتف"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        sx={{ minWidth: 260 }}
      />
      <Button type="submit" variant="outlined">بحث</Button>
    </Box>
  );
}
