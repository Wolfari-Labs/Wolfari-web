import type {
  InvitationRepository,
  InvitationPageViewModel,
} from '../../features/members/model/members';
import { fixtureViewerId, readableFixtureTrips } from './trip-catalog';
export function createFixtureInvitationRepository(
  options: { viewerId?: string } = {},
): InvitationRepository {
  const trips = readableFixtureTrips(options.viewerId ?? fixtureViewerId);
  return {
    async listInvitations({ tripId, scenario, signal }) {
      signal.throwIfAborted();
      if (scenario === 'loading')
        return new Promise((_, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
        );
      const trip = trips.find((t) => t.id === tripId);
      if (
        !trip ||
        trip.currentMembership.role !== 'OWNER' ||
        !['success', 'empty', 'expired', 'revoked', 'used'].includes(scenario)
      )
        return {
          status: 'error',
          error: {
            code:
              !trip || scenario === 'not-found'
                ? 'RESOURCE_NOT_FOUND'
                : trip.currentMembership.role !== 'OWNER' || scenario === 'forbidden'
                  ? 'PERMISSION_DENIED'
                  : scenario === 'conflict'
                    ? 'VERSION_CONFLICT'
                    : 'SERVICE_UNAVAILABLE',
            correlationId: 'fixture-invitations-read',
            retryable: !!trip && trip.currentMembership.role === 'OWNER' && scenario === 'error',
          },
        };
      if (scenario === 'empty') return { status: 'empty' };
      const state =
        scenario === 'expired'
          ? 'EXPIRED'
          : scenario === 'revoked'
            ? 'REVOKED'
            : scenario === 'used'
              ? 'ACCEPTED'
              : 'PENDING';
      const data: InvitationPageViewModel = {
        items: [
          {
            id: `e${tripId.slice(1)}`,
            tripId,
            invitationType: 'EMAIL',
            email: 'linh@example.com',
            status: state,
            version: state === 'PENDING' ? 1 : 2,
            expiresAt: state === 'EXPIRED' ? '2026-09-30T16:59:59Z' : '2026-10-30T16:59:59Z',
            resolvedAt: state === 'PENDING' || state === 'EXPIRED' ? null : '2026-10-14T09:00:00Z',
          },
        ],
        nextCursor: null,
      };
      return { status: 'ready', data: structuredClone(data) };
    },
  };
}
