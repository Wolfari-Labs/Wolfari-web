import type { PriceWatchRepository } from '../../features/price-watch/model/price-watch';

/** Legacy read-model boundary. Production uses runtime-price-watch.gateway-repository;
 * never substitute preview fixtures when the runtime service is unavailable. */
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
