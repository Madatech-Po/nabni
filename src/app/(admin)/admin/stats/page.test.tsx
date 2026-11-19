import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { AdminPilotStats } from '@/types/database';

const getPilotStats = vi.fn();
vi.mock('@/services/admin', () => ({
  REQUEST_STATUSES: ['open', 'closed', 'cancelled', 'removed'],
  VERIFICATION_STATUSES: ['pending', 'verified', 'rejected', 'suspended'],
  getPilotStats: () => getPilotStats(),
}));

import AdminStatsPage from './page';

const stats: AdminPilotStats = {
  parents: { total: 12, last_7_days: 3 },
  educators: { total: 7, last_7_days: 2 },
  educators_by_status: { pending: 2, verified: 4, rejected: 1, suspended: 0 },
  requests: { posted: { total: 9, last_7_days: 5 }, open: 6, closed: 1, cancelled: 1, removed: 1 },
  offers: { sent: { total: 15, last_7_days: 8 }, pending: 7, accepted: 3, declined: 2, withdrawn: 1, archived: 1, removed: 1 },
  avg_offers_per_request: 2.5,
  median_hours_to_first_offer: 0.4,
  matches: { total: 3, last_7_days: 1 },
  generated_at: '2026-11-12T10:00:00Z',
};

function card(label: string) {
  return screen.getByText(label).parentElement as HTMLElement;
}

function row(table: string, label: string) {
  return within(screen.getByRole('table', { name: table })).getByRole('row', { name: new RegExp(label) });
}

beforeEach(() => {
  getPilotStats.mockReset();
  getPilotStats.mockResolvedValue(stats);
});

describe('AdminStatsPage (NAB-125)', () => {
  it('shows each count with its total and last 7 days', async () => {
    render(await AdminStatsPage());

    expect(screen.getByRole('heading', { name: 'أرقام التجربة' })).toBeInTheDocument();
    expect(card('أولياء الأمور')).toHaveTextContent('١٢');
    expect(card('أولياء الأمور')).toHaveTextContent('آخر ٧ أيام: ٣');
    expect(card('المتخصصون')).toHaveTextContent('٧');
    expect(card('المتخصصون')).toHaveTextContent('آخر ٧ أيام: ٢');
    expect(card('طلبات منشورة')).toHaveTextContent('٩');
    expect(card('طلبات منشورة')).toHaveTextContent('آخر ٧ أيام: ٥');
    expect(card('عروض مرسلة')).toHaveTextContent('١٥');
    expect(card('عروض مرسلة')).toHaveTextContent('آخر ٧ أيام: ٨');
    expect(card('اتفاقات (عروض مقبولة)')).toHaveTextContent('٣');
    expect(card('اتفاقات (عروض مقبولة)')).toHaveTextContent('آخر ٧ أيام: ١');
  });

  it('shows the average offers per request and the median time to a first offer', async () => {
    render(await AdminStatsPage());

    expect(card('متوسط العروض لكل طلب')).toHaveTextContent('٢٫٥');
    expect(card('الوقت حتى أول عرض (الوسيط)')).toHaveTextContent('٢٤ دقيقة');
  });

  it('breaks educators, requests and offers down by status', async () => {
    render(await AdminStatsPage());

    expect(row('المتخصصون حسب حالة التوثيق', 'موثق')).toHaveTextContent('٤');
    expect(row('المتخصصون حسب حالة التوثيق', 'قيد المراجعة')).toHaveTextContent('٢');
    expect(row('الطلبات حسب الحالة', 'مفتوح')).toHaveTextContent('٦');
    expect(row('الطلبات حسب الحالة', 'مخفي بواسطة الإدارة')).toHaveTextContent('١');
    expect(row('العروض حسب الحالة', 'بانتظار رد ولي الأمر')).toHaveTextContent('٧');
    expect(row('العروض حسب الحالة', 'سحبه المتخصص')).toHaveTextContent('١');
    expect(within(screen.getByRole('table', { name: 'العروض حسب الحالة' })).getAllByRole('row')).toHaveLength(7);
  });

  it('says when the numbers were generated', async () => {
    render(await AdminStatsPage());

    expect(screen.getByText(/^آخر تحديث:/)).toHaveTextContent(/٢٠٢٦/);
  });

  it('shows dashes while there are no offers to average', async () => {
    getPilotStats.mockResolvedValue({ ...stats, avg_offers_per_request: null, median_hours_to_first_offer: null });
    render(await AdminStatsPage());

    expect(card('متوسط العروض لكل طلب')).toHaveTextContent('—');
    expect(card('الوقت حتى أول عرض (الوسيط)')).toHaveTextContent('—');
  });

  it('explains when the numbers cannot be loaded', async () => {
    getPilotStats.mockRejectedValue({ code: '42501', message: 'insufficient_privilege' });
    render(await AdminStatsPage());

    expect(screen.getByRole('alert')).toHaveTextContent('تعذّر تحميل الأرقام');
    expect(screen.queryByText(/^آخر تحديث:/)).not.toBeInTheDocument();
  });
});
