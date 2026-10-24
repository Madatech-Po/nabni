'use client';

import AdminListFilters from './AdminListFilters';
import { STATUS_LABELS } from './verificationStatus';

// No status param means the default "pending" queue; "all" shows every status.
const STATUS_OPTIONS = [
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
  { value: 'all', label: 'الكل' },
];

export default function EducatorReviewFilters() {
  return (
    <AdminListFilters
      selects={[{ param: 'status', label: 'الحالة', defaultValue: 'pending', options: STATUS_OPTIONS }]}
      searchLabel="بحث بالاسم أو رقم الهاتف"
    />
  );
}
