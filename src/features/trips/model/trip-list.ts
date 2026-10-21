export type { DomainError, ReadResult } from '../../../shared/types/result';

export type TripLifecycle = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'ARCHIVED';

export type TripListScenario =
  'success' | 'loading' | 'empty' | 'error' | 'forbidden' | 'conflict' | 'unavailable';

export const tripListScenarios: readonly TripListScenario[] = [
  'success',
  'loading',
  'empty',
  'error',
  'forbidden',
  'conflict',
  'unavailable',
];

// Domain projection; presentation extras stay nullable until a verified source supplies them.
export interface TripListItem {
  readonly id: string;
  readonly name: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly timezone: string;
  readonly lifecycle: TripLifecycle;
  readonly planVersion: number;
  readonly membershipRevision: number;
  readonly exportRevision: number;
  readonly currentMembership: {
    readonly id: string;
    readonly tripId: string;
    readonly userId: string;
    readonly role: 'OWNER' | 'MEMBER';
    readonly joinedAt: string;
    readonly leftAt: string | null;
  };
  readonly permissions: {
    readonly canRead: boolean;
    readonly canUpdate: boolean;
  };
  readonly presentation: {
    readonly memberCount: number | null;
    readonly cover: {
      readonly src: string;
      readonly mobileSrc: string | null;
      readonly alt: string;
    } | null;
  };
}

export interface TripListViewModel {
  readonly items: readonly TripListItem[];
  readonly nextCursor: string | null;
}
