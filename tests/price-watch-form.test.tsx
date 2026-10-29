import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PriceWatchForm } from '../src/features/price-watch/PriceWatchForm';
describe('PriceWatchForm contract and field feedback', () => {
  it('focuses the first invalid field without submitting', async () => {
    const save = vi.fn(),
      user = userEvent.setup();
    render(
      <PriceWatchForm
        initial={null}
        timezone="Asia/Ho_Chi_Minh"
        disabled={false}
        busy={false}
        onSave={save}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Lưu theo dõi' }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Sân bay đi (IATA)')).toHaveFocus();
    expect(screen.getByLabelText('Sân bay đi (IATA)')).toHaveAttribute('aria-invalid', 'true');
  });
  it('keeps the UTC calendar date and a positive VND int64 string', async () => {
    const save = vi.fn(),
      user = userEvent.setup();
    render(
      <PriceWatchForm
        initial={null}
        timezone="Asia/Ho_Chi_Minh"
        disabled={false}
        busy={false}
        onSave={save}
      />,
    );
    await user.type(screen.getByLabelText('Sân bay đi (IATA)'), 'dad');
    await user.type(screen.getByLabelText('Sân bay đến (IATA)'), 'sgn');
    await user.type(screen.getByLabelText('Ngày khởi hành'), '2099-01-02');
    await user.clear(screen.getByLabelText('Giờ khởi hành (UTC)'));
    await user.type(screen.getByLabelText('Giờ khởi hành (UTC)'), '01:00');
    await user.type(screen.getByLabelText('Ngưỡng cảnh báo (VND)'), '9223372036854775807');
    await user.click(screen.getByRole('button', { name: 'Lưu theo dõi' }));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: 'DAD',
        destination: 'SGN',
        departure_date: '2099-01-02',
        departure_at: '2099-01-02T01:00:00.000Z',
        threshold_price: '9223372036854775807',
        passengers: { adults: 1, children: 0, infants: 0 },
      }),
    );
  });
});
