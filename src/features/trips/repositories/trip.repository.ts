import type { ReadResult, TripListScenario, TripListViewModel } from '../model/trip-list';

export interface TripListRequest {
  readonly scenario: TripListScenario;
  readonly signal: AbortSignal;
}

// The adapter is session-scoped; the caller cannot select another viewer through a user ID.
export interface TripRepository {
  listTrips(request: TripListRequest): Promise<ReadResult<TripListViewModel>>;
}
