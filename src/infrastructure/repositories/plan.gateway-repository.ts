import type { PlanRepository } from '../../features/plan/model/plan';
export function createGatewayPlanRepository(reader?: PlanRepository['getPlan']): PlanRepository {
  return {
    getPlan:
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
