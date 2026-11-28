import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { PriceWatchForm } from '../src/features/price-watch/PriceWatchForm';
import { restoreCreateIntent } from '../src/features/price-watch/model/runtime-price-watch';
describe('PriceWatchForm contract and field feedback', () => {
  afterEach(() => vi.unstubAllEnvs());
  it.each(['TRAVELPAYOUTS_CACHE', 'SEARCHAPI_GOOGLE_FLIGHTS'])(
    '%s restricts passengers, journey and cabin without converting VND',
    async (provider) => {
      vi.stubEnv('VITE_PRICE_WATCH_PROVIDER', provider);
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
      for (const label of ['Hành trình', 'Người lớn', 'Trẻ em', 'Em bé', 'Hạng ghế'])
        expect(screen.getByLabelText(label)).toBeDisabled();
      await user.type(screen.getByLabelText('Sân bay đi (IATA)'), 'HAN');
      await user.type(screen.getByLabelText('Sân bay đến (IATA)'), 'DAD');
      await user.type(screen.getByLabelText('Ngày khởi hành'), '2099-01-02');
      await user.type(screen.getByLabelText('Ngưỡng cảnh báo (VND)'), '2000000');
      await user.click(screen.getByRole('button', { name: 'Lưu theo dõi' }));
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          provider,
          journey_type: 'ONE_WAY',
          passengers: { adults: 1, children: 0, infants: 0 },
          cabin_class: 'ECONOMY',
          currency: 'VND',
          threshold_price: '2000000',
        }),
      );
    },
  );
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
    vi.stubEnv('VITE_PRICE_WATCH_PROVIDER', 'MOCK_FLIGHT');
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
  it('lets the backend choose the configured provider and preserves that create intent', async () => {
    vi.stubEnv('VITE_PRICE_WATCH_PROVIDER', '');
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
    await user.type(screen.getByLabelText('Sân bay đi (IATA)'), 'HAN');
    await user.type(screen.getByLabelText('Sân bay đến (IATA)'), 'DAD');
    await user.type(screen.getByLabelText('Ngày khởi hành'), '2099-01-02');
    await user.type(screen.getByLabelText('Ngưỡng cảnh báo (VND)'), '2000000');
    await user.click(screen.getByRole('button', { name: 'Lưu theo dõi' }));
    const fields = save.mock.calls[0]![0];
    expect(fields).not.toHaveProperty('provider');
    expect(() =>
      restoreCreateIntent(
        JSON.stringify({
          method: 'POST',
          path: '/api/v1/trips/trip/price-watches',
          body: fields,
          key: '11111111-1111-4111-8111-111111111111',
        }),
        'trip',
      ),
    ).not.toThrow();
  });
});
