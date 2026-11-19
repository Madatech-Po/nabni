import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CategoriesSection from './CategoriesSection';

const categories = [
  { id: 4, name_ar: 'تأسيس عربي', slug: 'arabic-foundation' },
  { id: 7, name_ar: 'تخاطب', slug: 'speech-therapy' },
  { id: 20, name_ar: 'خدمة جديدة', slug: 'new-service' },
];

describe('CategoriesSection (NAB-129)', () => {
  it('shows one card per service, linking to the directory filtered by its id', () => {
    render(<CategoriesSection categories={categories} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(screen.getByRole('link', { name: /تأسيس عربي/ })).toHaveAttribute('href', '/educators?subject=4');
    expect(screen.getByRole('link', { name: /تخاطب/ })).toHaveAttribute('href', '/educators?subject=7');
    for (const link of links) expect(link.getAttribute('href')).not.toContain('category=');
  });

  it('uses the look for known slugs and a default for new ones', () => {
    render(<CategoriesSection categories={categories} />);

    expect(screen.getByText('علاج تأخر النطق وصعوبات الكلام')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /خدمة جديدة/ })).toHaveAttribute('href', '/educators?subject=20');
  });

  it('shows no hard-coded services that are not in the table', () => {
    render(<CategoriesSection categories={categories} />);

    expect(screen.queryByText('رياضيات')).not.toBeInTheDocument();
    expect(screen.queryByText('مونتيسوري')).not.toBeInTheDocument();
  });

  it('renders nothing without categories', () => {
    const { container } = render(<CategoriesSection categories={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
