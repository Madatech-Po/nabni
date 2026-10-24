'use client';

import { useEffect, useState } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, TextField, Button } from '@mui/material';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export interface FilterSelect {
  /** URL search param this select writes. */
  param: string;
  label: string;
  /** Shown when the param is absent. */
  defaultValue: string;
  options: { value: string; label: string }[];
}

// Filters for the admin lists. Everything lives in the URL so the server page can read it;
// changing a filter drops `page` so the result starts from the first page again.
export default function AdminListFilters({
  selects,
  searchLabel,
}: {
  selects: FilterSelect[];
  /** Omit to show only the selects. */
  searchLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQ = searchParams.get('q') || '';
  const [q, setQ] = useState(urlQ);

  // Keep the box in step with the applied search after back/forward navigation.
  useEffect(() => {
    setQ(urlQ);
  }, [urlQ]);

  function push(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete('page');
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
      {selects.map((select) => {
        const labelId = `${select.param}-filter-label`;
        return (
          <FormControl key={select.param} sx={{ minWidth: 180 }}>
            <InputLabel id={labelId}>{select.label}</InputLabel>
            <Select
              labelId={labelId}
              label={select.label}
              value={searchParams.get(select.param) || select.defaultValue}
              onChange={(e: SelectChangeEvent) => push({ [select.param]: e.target.value })}
            >
              {select.options.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      })}

      {searchLabel && (
        <>
          <TextField
            label={searchLabel}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{ minWidth: 260 }}
          />
          <Button type="submit" variant="outlined">بحث</Button>
        </>
      )}
    </Box>
  );
}
