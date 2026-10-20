import type { ReadResult, TripListScenario, TripListViewModel } from '../model/trip-list';
import type { TripDetailScenario, TripDetailViewModel } from '../model/trip-detail';

export interface CreateTripIntent {
  readonly name: string;
  readonly description?: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly timezone: string;
  readonly clientRequestId: string;
}

export type CreateTripField = 'name' | 'description' | 'startAt' | 'endAt' | 'timezone';

export type CreateTripResult =
  | { readonly status: 'created'; readonly tripId: string; readonly correlationId: string | null }
  | {
      readonly status: 'validation-error';
      readonly fieldErrors: Readonly<Partial<Record<CreateTripField, string>>>;
      readonly correlationId: string | null;
    }
  | {
      readonly status: 'forbidden' | 'conflict' | 'error' | 'unknown' | 'unavailable';
      readonly correlationId: string | null;
      readonly retryable: boolean;
    };

export interface TripListRequest {
  readonly scenario: TripListScenario;
  readonly signal: AbortSignal;
}

// The adapter is session-scoped; the caller cannot select another viewer through a user ID.
export interface TripRepository {
  createTrip(request: {
    readonly intent: CreateTripIntent;
    readonly signal: AbortSignal;
  }): Promise<CreateTripResult>;
  listTrips(request: TripListRequest): Promise<ReadResult<TripListViewModel>>;
  getTrip(request: {
    readonly tripId: string;
    readonly scenario: TripDetailScenario;
    readonly signal: AbortSignal;
  }): Promise<ReadResult<TripDetailViewModel>>;
}
