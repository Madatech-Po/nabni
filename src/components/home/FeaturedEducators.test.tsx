import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EducatorDirectoryItem } from '@/services/tutors';

// The carousel needs browser layout APIs that jsdom lacks; the cards are what matter here.
vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }));
vi.mock('embla-carousel-autoplay', () => ({ default: () => ({}) }));

import FeaturedEducators, { MIN_FEATURED_EDUCATORS } from './FeaturedEducators';

function educator(id: string, overrides: Partial<EducatorDirectoryItem> = {}): EducatorDirectoryItem {
  return {
    id,
    full_name: `متخصص ${id}`,
    bio: null,
    profile_image: null,
    experience_years: null,
    gender: null,
    governorate_id: null,
    governorate_name_ar: null,
    city_id: null,
    city_name_ar: null,
    subject_ids: [],
    level_ids: [],
    location_governorate_ids: [],
    created_at: null,
    subjects: [],
    ...overrides,
  };
}

const three = [
  educator('1', {
    full_name: 'منى علي',
    bio: 'معلمة تأسيس',
    experience_years: 4,
    governorate_name_ar: 'الجيزة',
    subjects: [{ id: 6, name_ar: 'رياضيات' }],
  }),
  educator('2', { full_name: 'أحمد سمير', profile_image: 'https://example.com/a.jpg' }),
  educator('3', { full_name: '[E2E] سارة' }),
];

describe('FeaturedEducators (NAB-123)', () => {
  it('shows the real educators it is given, with their details', () => {
    render(<FeaturedEducators educators={three} />);

    expect(screen.getByRole('heading', { name: 'متخصصون موثّقون على نبني' })).toBeInTheDocument();
    expect(screen.getByText('منى علي')).toBeInTheDocument();
    expect(screen.getByText('الجيزة')).toBeInTheDocument();
    expect(screen.getByText('4 سنوات خبرة')).toBeInTheDocument();
    expect(screen.getByText('رياضيات')).toBeInTheDocument();
    expect(screen.getByText('معلمة تأسيس')).toBeInTheDocument();
    expect(screen.getByText('أحمد سمير')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'عرض جميع المتخصصين' })).toHaveAttribute('href', '/educators');
  });

  it('uses the first letter of the name when there is no photo', () => {
    render(<FeaturedEducators educators={three} />);
    // "[E2E] سارة" starts with a symbol; getInitial skips it.
    expect(screen.getByText('م')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('shows no ratings, reviews or made-up counts', () => {
    render(<FeaturedEducators educators={three} />);
    expect(screen.queryByText(/تقييم/)).not.toBeInTheDocument();
    expect(screen.queryByText(/قام بمساعدة/)).not.toBeInTheDocument();
  });

  it(`invites educators to join when fewer than ${MIN_FEATURED_EDUCATORS} are verified`, () => {
    render(<FeaturedEducators educators={three.slice(0, MIN_FEATURED_EDUCATORS - 1)} />);

    expect(screen.queryByText('منى علي')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'انضم كمتخصص' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'سجّل كمتخصص' })).toHaveAttribute('href', '/register?role=educator');
  });
});
