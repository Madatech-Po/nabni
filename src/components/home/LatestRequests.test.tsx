import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { RequestFeedItem } from '@/services/requests';
import LatestRequests, { LATEST_REQUESTS_COUNT } from './LatestRequests';

function request(id: string): RequestFeedItem {
  return {
    id,
    student_age: 6,
    description: `طلب رقم ${id}`,
    preferred_educator_gender: null,
    budget: null,
    area: null,
    created_at: new Date().toISOString(),
    service_category: { name_ar: 'تأسيس عربي' },
    education_level: null,
    teaching_place: null,
    governorate: { name_ar: 'القاهرة' },
    pricing_unit: null,
  };
}

describe('LatestRequests (NAB-123)', () => {
  it('shows the real open requests it is given', () => {
    render(<LatestRequests requests={[request('1'), request('2')]} />);

    expect(screen.getByText('طلب رقم 1')).toBeInTheDocument();
    expect(screen.getByText('طلب رقم 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'عرض جميع الطلبات' })).toHaveAttribute('href', '/requests');
  });

  it(`shows at most ${LATEST_REQUESTS_COUNT}`, () => {
    const many = Array.from({ length: LATEST_REQUESTS_COUNT + 2 }, (_, i) => request(String(i + 1)));
    render(<LatestRequests requests={many} />);

    expect(screen.getAllByText(/^طلب رقم/)).toHaveLength(LATEST_REQUESTS_COUNT);
  });

  it('hides the section when nothing is open', () => {
    const { container } = render(<LatestRequests requests={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
