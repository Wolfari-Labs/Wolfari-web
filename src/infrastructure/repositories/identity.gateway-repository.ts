import type { IdentityRepository } from '../../features/auth/model/identity';
export function createGatewayIdentityRepository(readers?: IdentityRepository): IdentityRepository {
  const unavailable = async ({ signal }: Parameters<IdentityRepository['readSelf']>[0]) => {
    signal.throwIfAborted();
    return {
      status: 'error' as const,
      error: { code: 'SERVICE_UNAVAILABLE' as const, correlationId: null, retryable: false },
    };
  };
  return readers ?? { readSelf: unavailable, listSessions: unavailable };
}
