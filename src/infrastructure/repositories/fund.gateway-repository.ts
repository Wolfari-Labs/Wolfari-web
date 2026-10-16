import type { FundRepository } from '../../features/fund/model/fund';

export function createGatewayFundRepository(reader?: FundRepository['getFund']): FundRepository {
  return {
    getFund:
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
