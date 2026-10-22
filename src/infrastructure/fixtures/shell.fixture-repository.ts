import type { ReadResult, ShellSnapshot } from '../../features/shell/model/shell';
import type { ShellRepository } from '../../features/shell/repositories/shell.repository';
import { readableFixtureTrips } from './trip-catalog';
import { createFixtureTripStore, type FixtureTripStore } from './trip-store';

export { previewTripId } from './trip-catalog';

export function createFixtureShellRepository({ store = createFixtureTripStore() }: { store?: FixtureTripStore } = {}): ShellRepository {
  return {
    async read({ tripId, scenario, signal }): Promise<ReadResult<ShellSnapshot>> {
      signal.throwIfAborted();
      const trip = tripId ? readableFixtureTrips(undefined, store.readTrips()).find((item) => item.id === tripId) : null;
      if (tripId && !trip)
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
            trip && scenario !== 'guest'
              ? {
                  id: trip.id,
                  planVersion: trip.planVersion,
                  membershipRevision: trip.membershipRevision,
                  exportRevision: trip.exportRevision,
                  permissions: {
                    canRead: !['forbidden-snapshot', 'admin'].includes(scenario),
                    canUpdate:
                      !['forbidden-snapshot', 'admin'].includes(scenario) &&
                      trip.permissions.canUpdate,
                  },
                }
              : null,
        },
      };
    },
  };
}
