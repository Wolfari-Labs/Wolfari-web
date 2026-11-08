import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverviewFundSummary } from '../src/features/trips/components/OverviewFundSummary';
import type { RuntimeFund } from '../src/features/fund/model/runtime-fund';

const fund: RuntimeFund = {
  id: 'fund',
  trip_id: 'trip',
  holder_user_id: 'holder',
  currency: 'VND',
  budget_amount: '9000000',
  current_balance: '6250000',
  reserved_refund: '250000',
  available_balance: '6000000',
  status: 'OPEN',
  finance_version: 1,
  closed_at: null,
};

describe('Overview fund summary', () => {
  it('shows only balance, budget ratio and progress from authoritative amounts', () => {
    render(<OverviewFundSummary fund={fund} />);
    expect(screen.getByText('6.250.000 ₫')).toBeVisible();
    expect(screen.getByText('69% ngân sách · 9.000.000 ₫')).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '69');
    expect(screen.queryByText(/Khả dụng|Quỹ TEST|Đang mở/)).not.toBeInTheDocument();
  });
  it.each([null, '0'])('does not divide by absent/zero budget %s', (budget) => {
    render(<OverviewFundSummary fund={{ ...fund, budget_amount: budget }} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName(/Chưa đặt ngân sách|Ngân sách 0/);
    expect(
      screen.getByText(budget === null ? 'Chưa đặt ngân sách' : 'Ngân sách 0 ₫'),
    ).toBeVisible();
  });
  it('retains a measured zero when the fund has a budget', () => {
    render(<OverviewFundSummary fund={{ ...fund, current_balance: '0' }} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
  it('preserves int64 precision and clamps only the visual bar for over-budget funds', () => {
    render(
      <OverviewFundSummary
        fund={{ ...fund, current_balance: '9223372036854775807', budget_amount: '1' }}
      />,
    );
    expect(screen.getByText('9.223.372.036.854.775.807 ₫')).toBeVisible();
    expect(screen.getByText('922337203685477580700% ngân sách · 1 ₫')).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
  it.each([null, undefined])('keeps an unmeasured track for missing fund %s', (value) => {
    render(<OverviewFundSummary fund={value} />);
    expect(screen.getByRole('img')).toBeVisible();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
