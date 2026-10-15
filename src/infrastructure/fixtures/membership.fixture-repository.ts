import type {
  MembershipRepository,
  MembershipPageViewModel,
} from '../../features/members/model/members';
import { fixtureViewerId, readableFixtureTrips } from './trip-catalog';
export function createFixtureMembershipRepository(
  options: { viewerId?: string } = {},
): MembershipRepository {
  const trips = readableFixtureTrips(options.viewerId ?? fixtureViewerId);
  return {
    async listMembers({ tripId, scenario, signal }) {
      signal.throwIfAborted();
      if (scenario === 'loading')
        return new Promise((_, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
        );
      const trip = trips.find((t) => t.id === tripId);
      if (!trip || !['success', 'empty'].includes(scenario))
        return {
          status: 'error',
          error: {
            code:
              !trip || scenario === 'not-found'
                ? 'RESOURCE_NOT_FOUND'
                : scenario === 'forbidden'
                  ? 'PERMISSION_DENIED'
                  : scenario === 'conflict'
                    ? 'VERSION_CONFLICT'
                    : 'SERVICE_UNAVAILABLE',
            correlationId: 'fixture-members-read',
            retryable: !!trip && scenario === 'error',
          },
        };
      if (scenario === 'empty') return { status: 'empty' };
      const own = trip.currentMembership,
        count = trip.presentation.memberCount ?? 1;
      const items = Array.from({ length: count }, (_, i) =>
        i === 0
          ? { ...own, presentation: { displayName: null, avatar: null } }
          : {
              id: `d${tripId.slice(1, 24)}${String(i).padStart(12, '0')}`,
              tripId,
              userId: `c${String(i).padStart(7, '0')}-0000-4000-8000-${tripId.slice(-12)}`,
              role: own.role === 'MEMBER' && i === 1 ? ('OWNER' as const) : ('MEMBER' as const),
              joinedAt: own.joinedAt,
              leftAt: null,
              presentation: { displayName: null, avatar: null },
            },
      );
      const data: MembershipPageViewModel = { items, nextCursor: null };
      return { status: 'ready', data: structuredClone(data) };
    },
  };
}
