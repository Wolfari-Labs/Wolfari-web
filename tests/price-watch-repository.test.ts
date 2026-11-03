import { describe, expect, it } from 'vitest';
import { createFixturePriceWatchRepository } from '../src/infrastructure/fixtures/price-watch.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

const request = (
  scenario: Parameters<
    ReturnType<typeof createFixturePriceWatchRepository>['getPriceWatch']
  >[0]['scenario'] = 'success',
) => ({ tripId: previewTripId, scenario, signal: new AbortController().signal });

describe('PriceWatch fixture repository', () => {
  it('returns self and other-member watches with retained price history', async () => {
    const result = await createFixturePriceWatchRepository().getPriceWatch(request());
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.data.watches).toHaveLength(2);
    expect(result.data.watches[0]?.selfOwned).toBe(true);
    expect(result.data.watches[1]?.selfOwned).toBe(false);
    expect(result.data.watches[0]?.latestPriceVnd).toBe('2350000');
    expect(result.data.watches[0]?.observations.every((item) => item.priceVnd !== '0')).toBe(true);
  });

  it('keeps the last price when the provider fails', async () => {
    const result = await createFixturePriceWatchRepository().getPriceWatch(
      request('provider-error'),
    );
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.data.watches[0]?.status).toBe('ACTIVE');
    expect(result.data.watches[0]?.dataQuality).toBe('PROVIDER_ERROR');
    expect(result.data.watches[0]?.passengers).toEqual({ adults: 1, children: 0, infants: 0 });
    expect(result.data.watches[0]?.latestPriceVnd).toBe('2350000');
    expect(result.data.watches[0]?.observedAt).toBe('2026-09-03T10:00:00+07:00');
    expect(result.data.watches[0]?.observations.at(-1)?.priceVnd).toBeNull();
    expect(result.data.watches[0]?.observations.at(-1)?.status).toBe('PROVIDER_ERROR');
  });

  it('maps read states without exposing mutation methods', async () => {
    const repository = createFixturePriceWatchRepository();
    for (const [scenario, code] of [
      ['forbidden', 'PERMISSION_DENIED'],
      ['not-found', 'RESOURCE_NOT_FOUND'],
      ['conflict', 'VERSION_CONFLICT'],
      ['unavailable', 'SERVICE_UNAVAILABLE'],
    ] as const) {
      const result = await repository.getPriceWatch(request(scenario));
      expect(result).toEqual(expect.objectContaining({ status: 'error' }));
      if (result.status === 'error') expect(result.error.code).toBe(code);
    }
  });
});
