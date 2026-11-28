import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createGatewayHttpClient } from '../src/infrastructure/http/http-client';
import {
  createRuntimePriceWatchRepository,
  decodeCapabilities,
  decodeWatch,
} from '../src/infrastructure/repositories/runtime-price-watch.gateway-repository';
import {
  capabilitiesLine,
  capabilityErrors,
  type PriceWatchCapabilities,
} from '../src/features/price-watch/model/runtime-price-watch';
import { PriceWatchForm } from '../src/features/price-watch/PriceWatchForm';

const tripId = '11111111-1111-4111-8111-111111111111';
const searchApi = {
  provider: 'SEARCHAPI_GOOGLE_FLIGHTS',
  available: true,
  journey_types: ['ONE_WAY'],
  cabin_classes: ['ECONOMY'],
  max_adults: 1,
  max_children: 0,
  max_infants: 0,
  max_passengers: 1,
  currencies: ['VND'],
};
const reference: PriceWatchCapabilities = decodeCapabilities(searchApi);
const mixed: PriceWatchCapabilities = {
  provider: 'MOCK_FLIGHT',
  available: true,
  journeyTypes: ['ONE_WAY', 'ROUND_TRIP'],
  cabinClasses: ['ECONOMY', 'BUSINESS'],
  maxAdults: 2,
  maxChildren: 1,
  maxInfants: 0,
  maxPassengers: 3,
  currencies: ['VND'],
};
const envelope = (data: unknown, status = 200) =>
  new Response(
    JSON.stringify(
      status === 200
        ? { data, meta: { correlation_id: 'pw-test' } }
        : {
            error: { code: 'RESOURCE_NOT_FOUND', message: 'x', retryable: false, details: null },
            meta: { correlation_id: 'pw-test' },
          },
    ),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
function repo(response: () => Response) {
  const transport = vi.fn<typeof fetch>().mockImplementation(async () => response());
  return {
    transport,
    repository: createRuntimePriceWatchRepository(createGatewayHttpClient({ transport })),
  };
}
const form = (capabilities: PriceWatchCapabilities | null, save = vi.fn()) => {
  render(
    <PriceWatchForm
      initial={null}
      timezone="Asia/Ho_Chi_Minh"
      disabled={false}
      busy={false}
      capabilities={capabilities}
      onSave={save}
    />,
  );
  return save;
};
async function fillRoute(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Sân bay đi (IATA)'), 'HAN');
  await user.type(screen.getByLabelText('Sân bay đến (IATA)'), 'DAD');
  await user.type(screen.getByLabelText('Ngày khởi hành'), '2099-01-02');
  await user.type(screen.getByLabelText('Ngưỡng cảnh báo (VND)'), '2000000');
}

describe('price watch capabilities contract', () => {
  it('reads the configured source and falls back to null on an older Gateway (404)', async () => {
    const ok = repo(() => envelope(searchApi));
    expect(await ok.repository.capabilities()).toEqual(reference);
    expect(ok.transport.mock.calls[0]![0]).toBe('/api/v1/price-watch-capabilities');
    expect(await repo(() => envelope(null, 404)).repository.capabilities()).toBeNull();
    await expect(
      repo(() => new Response('{}', { status: 503 })).repository.capabilities(),
    ).rejects.toThrow();
  });
  it.each([
    { provider: 'OTHER' },
    { available: 'yes' },
    { journey_types: ['ONE_WAY', 'ONE_WAY'] },
    { journey_types: ['MULTI_CITY'] },
    { cabin_classes: 'ECONOMY' },
    { max_adults: 10 },
    { max_children: -1 },
    { max_passengers: 1.5 },
    { currencies: ['USD'] },
    { journey_types: [] },
    { max_adults: 0 },
  ])('rejects capabilities outside the contract %#', (change) => {
    expect(() => decodeCapabilities({ ...searchApi, ...change })).toThrow();
  });
  it('accepts an unavailable source with empty lists', () => {
    expect(
      decodeCapabilities({
        ...searchApi,
        available: false,
        journey_types: [],
        cabin_classes: [],
        max_adults: 0,
        max_passengers: 0,
      }).available,
    ).toBe(false);
  });
  it('decodes SearchApi watches with the one-way, economy, one-adult rule', () => {
    const watch = {
      id: '22222222-2222-4222-8222-222222222222',
      trip_id: tripId,
      user_id: '33333333-3333-4333-8333-333333333333',
      status: 'ACTIVE',
      status_reason: null,
      version: 1,
      expires_at: '2099-01-02T09:00:00Z',
      threshold_price: '2000000',
      normalized_query: {
        provider: 'SEARCHAPI_GOOGLE_FLIGHTS',
        transport_type: 'FLIGHT',
        origin: 'HAN',
        destination: 'DAD',
        departure_date: '2099-01-02',
        departure_at: '2099-01-02T09:00:00Z',
        return_date: null,
        journey_type: 'ONE_WAY',
        passengers: { adults: 1, children: 0, infants: 0 },
        cabin_class: 'ECONOMY',
        currency: 'VND',
      },
    };
    expect(decodeWatch(watch, tripId).fields.provider).toBe('SEARCHAPI_GOOGLE_FLIGHTS');
    expect(() =>
      decodeWatch(
        {
          ...watch,
          normalized_query: {
            ...watch.normalized_query,
            passengers: { adults: 2, children: 0, infants: 0 },
          },
        },
        tripId,
      ),
    ).toThrow();
  });
  it('describes the source in one line and validates against it', () => {
    expect(capabilitiesLine(reference)).toBe(
      'Google Flights (SearchApi) so sánh vé một chiều, hạng phổ thông, 1 người lớn.',
    );
    expect(
      capabilitiesLine({
        ...mixed,
        cabinClasses: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'],
        maxPassengers: 9,
      }),
    ).toBe(
      'Giá mô phỏng (MOCK_FLIGHT) so sánh vé một chiều hoặc khứ hồi, mọi hạng ghế, tối đa 9 hành khách.',
    );
    expect(
      capabilityErrors(
        {
          journey_type: 'ROUND_TRIP',
          cabin_class: 'FIRST',
          passengers: { adults: 2, children: 1, infants: 1 },
          currency: 'VND',
        },
        reference,
      ),
    ).toEqual({
      journey_type: 'Nguồn giá hiện tại không hỗ trợ hành trình này.',
      cabin_class: 'Nguồn giá hiện tại không hỗ trợ hạng ghế này.',
      adults: 'Nguồn giá hỗ trợ tối đa 1 người lớn.',
      children: 'Nguồn giá hỗ trợ tối đa 0 trẻ em.',
      infants: 'Nguồn giá hỗ trợ tối đa 0 em bé.',
    });
  });
});

describe('price watch form with capabilities', () => {
  it('hides single-value choices and sends the configured source', async () => {
    const user = userEvent.setup();
    const save = form(reference);
    expect(
      screen.getByText(
        /^Google Flights \(SearchApi\) so sánh vé một chiều, hạng phổ thông, 1 người lớn\./,
      ),
    ).toBeVisible();
    for (const label of ['Hành trình', 'Hạng ghế', 'Người lớn', 'Trẻ em', 'Em bé'])
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
    await fillRoute(user);
    await user.click(screen.getByRole('button', { name: 'Lưu theo dõi' }));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'SEARCHAPI_GOOGLE_FLIGHTS',
        journey_type: 'ONE_WAY',
        cabin_class: 'ECONOMY',
        passengers: { adults: 1, children: 0, infants: 0 },
        currency: 'VND',
      }),
    );
  });
  it('offers only supported options, caps passenger inputs and blocks unsupported mixes', async () => {
    const user = userEvent.setup();
    const save = form(mixed);
    const cabins = [...screen.getByLabelText('Hạng ghế').querySelectorAll('option')].map(
      (option) => option.value,
    );
    expect(cabins).toEqual(['', 'ECONOMY', 'BUSINESS']);
    expect(screen.getByLabelText('Hành trình')).toBeEnabled();
    expect(screen.getByLabelText('Người lớn')).toHaveAttribute('max', '2');
    expect(screen.getByLabelText('Trẻ em')).toHaveAttribute('max', '1');
    expect(screen.queryByLabelText('Em bé')).not.toBeInTheDocument();
    await fillRoute(user);
    await user.clear(screen.getByLabelText('Người lớn'));
    await user.type(screen.getByLabelText('Người lớn'), '3');
    await user.click(screen.getByRole('button', { name: 'Lưu theo dõi' }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByText('Nguồn giá hỗ trợ tối đa 2 người lớn.')).toBeVisible();
    expect(screen.getByLabelText('Người lớn')).toHaveFocus();
  });
  it('disables creating while the source is unavailable', () => {
    const save = form({ ...reference, available: false });
    expect(screen.getByText(/Nguồn giá chưa sẵn sàng/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Lưu theo dõi' })).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });
});
