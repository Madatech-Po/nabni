import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsSection from './StatsSection';

const stats = { verified_active_educators: 4, open_requests: 2, governorates_covered: 3, accepted_offers_total: 1 };

describe('StatsSection (NAB-123)', () => {
  it('shows the real counts with their labels, without "+"', () => {
    render(<StatsSection stats={stats} />);

    expect(screen.getByText('٤')).toBeInTheDocument();
    expect(screen.getByText('متخصص موثّق على نبني')).toBeInTheDocument();
    expect(screen.getByText('٢')).toBeInTheDocument();
    expect(screen.getByText('طلب مفتوح الآن')).toBeInTheDocument();
    expect(screen.getByText('٣')).toBeInTheDocument();
    expect(screen.getByText('محافظة يعمل فيها متخصصونا')).toBeInTheDocument();
    expect(screen.getByText('١')).toBeInTheDocument();
    expect(screen.getByText('اتفاق تم بين ولي أمر ومتخصص')).toBeInTheDocument();
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
    expect(screen.queryByText('متوسط التقييم')).not.toBeInTheDocument();
  });

  it('hides the section when the numbers could not be loaded', () => {
    const { container } = render(<StatsSection stats={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('leaves out counts that are still zero', () => {
    render(<StatsSection stats={{ ...stats, accepted_offers_total: 0 }} />);
    expect(screen.queryByText('اتفاق تم بين ولي أمر ومتخصص')).not.toBeInTheDocument();
    expect(screen.getByText('طلب مفتوح الآن')).toBeInTheDocument();
  });

  it('hides the section when every count is zero', () => {
    const { container } = render(
      <StatsSection stats={{ verified_active_educators: 0, open_requests: 0, governorates_covered: 0, accepted_offers_total: 0 }} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
