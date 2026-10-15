import type { HomeRepository } from '../../features/home/model/home';
// Public inspiration projection has no verified Gateway route; never filter a private Trip DTO.
export function createGatewayHomeRepository(
  reader?: HomeRepository['readLanding'],
): HomeRepository {
  return {
    readLanding:
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
