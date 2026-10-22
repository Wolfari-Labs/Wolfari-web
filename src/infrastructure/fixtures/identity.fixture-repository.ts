import type {
  IdentityReadRequest,
  IdentityRepository,
  SelfProfileViewModel,
  IdentitySessionsViewModel,
} from '../../features/auth/model/identity';
import type { ReadResult } from '../../shared/types/result';
const profile: SelfProfileViewModel = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  fullName: 'Trang Nguyễn',
  email: 'trang.nguyen@example.com',
  avatar: null,
  version: 1,
  systemRole: 'USER',
  status: 'ACTIVE',
  emailVerifiedAt: '2026-09-01T00:00:00Z',
};
const sessions: IdentitySessionsViewModel = {
  items: [
    {
      id: '99999999-9999-4999-8999-999999999999',
      createdAt: '2026-10-14T01:00:00Z',
      lastUsedAt: '2026-10-15T01:00:00Z',
      expiresAt: '2026-11-14T01:00:00Z',
      revokedAt: null,
    },
  ],
  nextCursor: null,
};
async function read<T>({ scenario, signal }: IdentityReadRequest, data: T): Promise<ReadResult<T>> {
  signal.throwIfAborted();
  const effectiveScenario = scenario ?? 'success';
  if (effectiveScenario === 'loading')
    return new Promise((_, reject) =>
      signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
    );
  if (effectiveScenario === 'empty') return { status: 'empty' };
  if (effectiveScenario === 'success') return { status: 'ready', data: structuredClone(data) };
  return {
    status: 'error',
    error: {
      code:
        effectiveScenario === 'forbidden'
          ? 'PERMISSION_DENIED'
          : effectiveScenario === 'not-found'
            ? 'RESOURCE_NOT_FOUND'
            : effectiveScenario === 'conflict'
              ? 'VERSION_CONFLICT'
              : 'SERVICE_UNAVAILABLE',
      correlationId: 'fixture-identity-read',
      retryable: effectiveScenario === 'error',
    },
  };
}
export function createFixtureIdentityRepository(): IdentityRepository {
  return {
    readSelf: (input) => read(input, profile),
    listSessions: (input) => read(input, sessions),
  };
}
