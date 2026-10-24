import type { RequestStatus } from '@/types/database';

export function countByStatus(requests: { status: RequestStatus }[]): Record<RequestStatus, number> {
  const counts: Record<RequestStatus, number> = { open: 0, closed: 0, cancelled: 0, removed: 0 };
  for (const r of requests) counts[r.status] += 1;
  return counts;
}
