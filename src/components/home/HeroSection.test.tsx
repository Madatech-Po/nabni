import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import HeroSection, { educatorSearchHref } from './HeroSection';

const SEARCH_LABEL = 'ابحث عن متخصص، مادة، أو محافظة';

beforeEach(() => {
  push.mockReset();
});

describe('educatorSearchHref (NAB-130)', () => {
  it('puts the trimmed text in q', () => {
    expect(educatorSearchHref('  تخاطب ')).toBe(`/educators?q=${encodeURIComponent('تخاطب')}`);
  });

  it('goes to the whole directory when the text is empty', () => {
    expect(educatorSearchHref('   ')).toBe('/educators');
  });

  it('encodes characters that would break the URL', () => {
    expect(educatorSearchHref('a&b=c')).toBe('/educators?q=a%26b%3Dc');
  });
});

describe('HeroSection search (NAB-130)', () => {
  it('searches the directory when Enter is pressed', async () => {
    render(<HeroSection />);

    await userEvent.type(screen.getByRole('textbox', { name: SEARCH_LABEL }), 'منى{Enter}');

    expect(push).toHaveBeenCalledWith(`/educators?q=${encodeURIComponent('منى')}`);
  });

  it('searches the directory from the search button', async () => {
    render(<HeroSection />);

    await userEvent.type(screen.getByRole('textbox', { name: SEARCH_LABEL }), 'رياضيات');
    await userEvent.click(screen.getByRole('button', { name: 'ابحث عن متخصص' }));

    expect(push).toHaveBeenCalledWith(`/educators?q=${encodeURIComponent('رياضيات')}`);
  });

  it('opens the whole directory when the box is empty', async () => {
    render(<HeroSection />);

    await userEvent.click(screen.getByRole('button', { name: 'ابحث عن متخصص' }));

    expect(push).toHaveBeenCalledWith('/educators');
  });
});
