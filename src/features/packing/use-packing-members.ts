import { useQuery } from '@tanstack/react-query';
import { useMembersRepositories } from '../members/repositories/members-context';
import type { MembershipViewModel } from '../members/model/members';
import type { TripDetailViewModel } from '../trips/model/trip-detail';

export function usePackingMembers(trip: TripDetailViewModel | null, enabled = true) {
  const { membership } = useMembersRepositories();
  return useQuery({
    queryKey: [
      'members',
      trip?.id,
      'packing-roster',
      trip?.currentMembership.userId,
      trip?.membershipRevision,
    ],
    enabled: enabled && !!trip && trip.currentMembership.leftAt === null,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async ({ signal }) => {
      if (!trip) throw Error('Missing trip');
      const members = new Map<string, MembershipViewModel>();
      const seen = new Set<string>();
      let cursor: string | undefined;
      do {
        const result = await membership.listMembers({
          tripId: trip.id,
          scenario: 'success',
          signal,
          includeLeft: false,
          limit: 100,
          ...(cursor ? { cursor } : {}),
        });
        if (result.status === 'error') throw Error(result.error.code);
        if (result.status === 'empty') break;
        for (const member of result.data.items)
          if (member.tripId === trip.id && member.leftAt === null) members.set(member.id, member);
        cursor = result.data.nextCursor ?? undefined;
        if (cursor) {
          if (seen.has(cursor) || seen.size >= 100) throw Error('Invalid member cursor');
          seen.add(cursor);
        }
      } while (cursor);
      return [...members.values()];
    },
  });
}
