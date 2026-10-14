import type { ReadResult, ShellSnapshot } from '../../features/shell/model/shell';
import type { ShellRepository } from '../../features/shell/repositories/shell.repository';

export const previewTripId = '11111111-1111-4111-8111-111111111111';

export function createFixtureShellRepository(): ShellRepository {
  return {
    async read({ tripId, scenario, signal }): Promise<ReadResult<ShellSnapshot>> {
      signal.throwIfAborted();
      if (tripId && tripId !== previewTripId)
        return {
          status: 'error',
          error: {
            code: 'RESOURCE_NOT_FOUND',
            correlationId: 'fixture-app-shell',
            retryable: false,
          },
        };
      if (scenario === 'loading') {
        return new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        });
      }
      if (scenario === 'empty') return { status: 'empty' };
      if (!['success', 'guest', 'admin', 'forbidden-snapshot'].includes(scenario)) {
        const code =
          scenario === 'forbidden'
            ? 'PERMISSION_DENIED'
            : scenario === 'not-found'
              ? 'RESOURCE_NOT_FOUND'
              : scenario === 'conflict'
                ? 'VERSION_CONFLICT'
                : 'SERVICE_UNAVAILABLE';
        return {
          status: 'error',
          error: {
            code,
            correlationId: 'fixture-app-shell',
            retryable: scenario === 'error',
          },
        };
      }
      return {
        status: 'ready',
        data: {
          viewer:
            scenario === 'guest'
              ? null
              : {
                  fullName: 'Trang Nguyễn',
                  version: 1,
                  systemRole: scenario === 'admin' ? 'ADMIN' : 'USER',
                },
          trip:
            tripId && scenario !== 'guest'
              ? {
                  id: previewTripId,
                  planVersion: 1,
                  membershipRevision: 1,
                  exportRevision: 1,
                  permissions: {
                    canRead: !['forbidden-snapshot', 'admin'].includes(scenario),
                    canUpdate: false,
                  },
                }
              : null,
        },
      };
    },
  };
}
