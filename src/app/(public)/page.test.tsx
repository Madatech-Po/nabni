import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const getPublicHomeStats = vi.fn();
const getEducators = vi.fn();
const getOpenRequests = vi.fn();
vi.mock('@/services/homeStats', () => ({ getPublicHomeStats: () => getPublicHomeStats() }));
vi.mock('@/services/tutors', () => ({ getEducators: () => getEducators() }));
vi.mock('@/services/requests', () => ({ getOpenRequests: () => getOpenRequests() }));
vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }));
vi.mock('embla-carousel-autoplay', () => ({ default: () => ({}) }));

import Home from './page';

function educator(id: string) {
  return {
    id, full_name: `متخصص ${id}`, bio: null, profile_image: null, experience_years: null, gender: null,
    governorate_id: null, governorate_name_ar: null, city_id: null, city_name_ar: null,
    subject_ids: [], level_ids: [], location_governorate_ids: [], created_at: null, subjects: [],
  };
}

const request = {
  id: 'r1', student_age: 5, description: 'طلب تأسيس حقيقي', preferred_educator_gender: null, budget: null, area: null,
  created_at: new Date().toISOString(), service_category: { name_ar: 'تأسيس عربي' }, education_level: null,
  teaching_place: null, governorate: null, pricing_unit: null,
};

beforeEach(() => {
  // Some sections fade in when scrolled into view.
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
  });
  getPublicHomeStats.mockResolvedValue({
    verified_active_educators: 3, open_requests: 1, governorates_covered: 2, accepted_offers_total: 0,
  });
  getEducators.mockResolvedValue(['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(educator));
  getOpenRequests.mockResolvedValue([request]);
});

describe('Home page (NAB-123)', () => {
  it('shows real counts, educators and requests', async () => {
    render(await Home());

    expect(screen.getByText('متخصص موثّق على نبني')).toBeInTheDocument();
    expect(screen.getByText('متخصص 1')).toBeInTheDocument();
    expect(screen.getByText('طلب تأسيس حقيقي')).toBeInTheDocument();
  });

  it('shows at most 8 educators', async () => {
    render(await Home());

    expect(screen.getByText('متخصص 8')).toBeInTheDocument();
    expect(screen.queryByText('متخصص 9')).not.toBeInTheDocument();
  });

  it('has no made-up reviews, ratings or counts', async () => {
    render(await Home());

    expect(screen.queryByText(/ماذا يقول أولياء الأمور/)).not.toBeInTheDocument();
    expect(screen.queryByText(/تقييم/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+\+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d+ متخصص$/)).not.toBeInTheDocument();
  });

  it('still renders when every data source fails, hiding those sections', async () => {
    getPublicHomeStats.mockResolvedValue(null);
    getEducators.mockRejectedValue(new Error('down'));
    getOpenRequests.mockRejectedValue(new Error('down'));
    render(await Home());

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText('متخصص موثّق على نبني')).not.toBeInTheDocument();
    expect(screen.queryByText('يبحث أولياء الأمور الآن عن...')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'انضم كمتخصص' })).toBeInTheDocument();
  });
});
