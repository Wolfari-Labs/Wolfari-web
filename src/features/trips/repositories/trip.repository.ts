import type { ReadResult, TripListScenario, TripListViewModel } from '../model/trip-list';
import type { TripDetailScenario, TripDetailViewModel } from '../model/trip-detail';

export interface TripListRequest {
  readonly scenario: TripListScenario;
  readonly signal: AbortSignal;
}

// The adapter is session-scoped; the caller cannot select another viewer through a user ID.
export interface TripRepository {
  listTrips(request: TripListRequest): Promise<ReadResult<TripListViewModel>>;
  getTrip(request: {
    readonly tripId: string;
    readonly scenario: TripDetailScenario;
    readonly signal: AbortSignal;
  }): Promise<ReadResult<TripDetailViewModel>>;
}
