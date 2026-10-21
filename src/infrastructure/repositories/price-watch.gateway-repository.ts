import type { PriceWatchRepository } from '../../features/price-watch/model/price-watch';

/** Price Watch has no public Web contract yet; keep the production adapter unavailable. */
export function createGatewayPriceWatchRepository(
  reader?: PriceWatchRepository['getPriceWatch'],
): PriceWatchRepository {
  return {
    getPriceWatch:
      reader ??
      (async ({ signal }) => {
        signal.throwIfAborted();
        return {
          status: 'error',
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: false },
        };
      }),
  };
}
