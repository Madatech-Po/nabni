'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box } from '@mui/material';

export const ADMIN_SECTIONS = [
  { href: '/admin/educators', label: 'توثيق المعلمين' },
  { href: '/admin/parents', label: 'أولياء الأمور' },
  { href: '/admin/requests', label: 'الطلبات' },
  { href: '/admin/logs', label: 'سجل الإجراءات' },
] as const;

export default function AdminNav() {
  const pathname = usePathname();

  return (
    // Scrolls sideways on narrow screens instead of wrapping under the title.
    <Box component="nav" aria-label="أقسام لوحة التحكم" sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
      {ADMIN_SECTIONS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Box
            key={href}
            component={Link}
            href={href}
            aria-current={active ? 'page' : undefined}
            sx={{
              px: 1.5,
              py: 0.75,
              borderRadius: 1,
              whiteSpace: 'nowrap',
              color: 'inherit',
              textDecoration: 'none',
              fontWeight: active ? 'bold' : 'normal',
              bgcolor: active ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.12)' },
            }}
          >
            {label}
          </Box>
        );
      })}
    </Box>
  );
}
