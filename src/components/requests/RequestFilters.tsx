'use client';

import { useEffect, useState } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Button } from '@mui/material';
import { X } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { getGovernorates, getServiceCategories, Governorate, ServiceCategory } from '@/services/lookups';

export default function RequestFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [subjects, setSubjects] = useState<ServiceCategory[]>([]);

  const currentSubject = searchParams.get('subject') || '';
  const currentGovernorate = searchParams.get('governorate') || '';

  useEffect(() => {
    Promise.all([getGovernorates(), getServiceCategories()])
      .then(([govs, subs]) => {
        setGovernorates(govs);
        setSubjects(subs);
      })
      .catch(() => {
        // Filters degrade gracefully to empty dropdowns if lookups fail to load.
      });
  }, []);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters = Boolean(currentSubject || currentGovernorate);

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 4 }}>
      <FormControl sx={{ minWidth: 220 }}>
        <InputLabel id="req-subject-filter-label">الخدمة</InputLabel>
        <Select
          labelId="req-subject-filter-label"
          label="الخدمة"
          value={currentSubject}
          onChange={(e: SelectChangeEvent) => updateParam('subject', e.target.value)}
        >
          <MenuItem value="">كل الخدمات</MenuItem>
          {subjects.map((s) => (
            <MenuItem key={s.id} value={s.id.toString()}>
              {s.name_ar}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 220 }}>
        <InputLabel id="req-gov-filter-label">المحافظة</InputLabel>
        <Select
          labelId="req-gov-filter-label"
          label="المحافظة"
          value={currentGovernorate}
          onChange={(e: SelectChangeEvent) => updateParam('governorate', e.target.value)}
        >
          <MenuItem value="">كل المحافظات</MenuItem>
          {governorates.map((g) => (
            <MenuItem key={g.id} value={g.id.toString()}>
              {g.name_ar}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {hasFilters && (
        <Button startIcon={<X size={16} />} onClick={() => router.push(pathname)} color="inherit">
          مسح الفلاتر
        </Button>
      )}
    </Box>
  );
}
