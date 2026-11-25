import type { ReadResult, TripListScenario, TripListViewModel } from '../model/trip-list';
import type { TripDetailScenario, TripDetailViewModel } from '../model/trip-detail';

export interface CreateTripIntent {
  readonly name: string;
  readonly description?: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly timezone: string;
  readonly budgetAmount?: string;
  readonly clientRequestId: string;
}

export type CreateTripField =
  'name' | 'description' | 'startAt' | 'endAt' | 'timezone' | 'budgetAmount';

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

export interface UpdateTripIntent {
  readonly name?: string;
  readonly description?: string | null;
  readonly publicDescription?: string | null;
  readonly startAt?: string;
  readonly endAt?: string;
  readonly timezone?: string;
  readonly budgetAmount?: string | null;
  readonly expectedPlanVersion: number;
  readonly expectedExportRevision: number;
  readonly idempotencyKey: string;
}

export type UpdateTripField =
  'name' | 'description' | 'publicDescription' | 'startAt' | 'endAt' | 'timezone' | 'budgetAmount';

export type UpdateTripResult =
  | {
      readonly status: 'updated';
      readonly trip: TripDetailViewModel;
      readonly correlationId: string | null;
    }
  | {
      readonly status: 'validation-error';
      readonly fieldErrors: Readonly<Partial<Record<UpdateTripField, string>>>;
      readonly correlationId: string | null;
    }
  | {
      readonly status: 'forbidden' | 'not-found' | 'conflict' | 'unavailable' | 'unknown';
      readonly correlationId: string | null;
      readonly retryable: boolean;
      readonly reason?: 'TRIP_RANGE_CONFLICT';
    };

export type PlanEditPolicy = 'ALL_MEMBERS' | 'OWNER_ONLY' | 'SELECTED_MEMBERS';
export interface PlanPolicySnapshot {
  policy: PlanEditPolicy;
  editorMemberIds: readonly string[];
  membershipRevision: number;
}
export type UpdatePlanPolicyResult =
  | {
      readonly status: 'updated';
      readonly data: {
        readonly policy: PlanEditPolicy;
        readonly editorMemberIds: readonly string[];
        readonly membershipRevision: number;
      };
      readonly correlationId: string | null;
    }
  | { readonly status: 'error'; readonly error: import('../../../shared/types/result').DomainError }
  | {
      readonly status: 'unknown';
      readonly error: import('../../../shared/types/result').DomainError;
    };

export interface TripListRequest {
  readonly scenario: TripListScenario;
  readonly signal: AbortSignal;
  readonly cursor?: string;
  readonly limit?: number;
}

export type TripManagementAction = 'ARCHIVE' | 'REOPEN' | 'DELETE' | 'TRANSFER';
export interface PersonalReminder {
  readonly id: string;
  readonly trip_id: string;
  readonly source_type: 'ACTIVITY' | 'PACKING';
  readonly source_id: string;
  readonly remind_at: string;
  readonly source_at: string | null;
  readonly status: 'PENDING' | 'PROCESSING' | 'SENT' | 'CANCELLED' | 'FAILED';
  readonly created_at: string;
}

// The adapter is session-scoped; the caller cannot select another viewer through a user ID.
export interface TripRepository {
  getPlanPolicy?(request: {
    tripId: string;
    signal: AbortSignal;
  }): Promise<ReadResult<PlanPolicySnapshot>>;
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
  updateTrip(request: {
    readonly tripId: string;
    readonly intent: UpdateTripIntent;
    readonly signal: AbortSignal;
  }): Promise<UpdateTripResult>;
  updatePlanPolicy?(request: {
    readonly tripId: string;
    readonly policy: PlanEditPolicy;
    readonly editorMemberIds: readonly string[];
    readonly expectedMembershipRevision: number;
    readonly idempotencyKey: string;
    readonly signal: AbortSignal;
  }): Promise<UpdatePlanPolicyResult>;
  uploadCover?(request: {
    readonly tripId: string;
    readonly file: File;
    readonly signal: AbortSignal;
  }): Promise<TripDetailViewModel>;
  removeCover?(request: {
    readonly tripId: string;
    readonly signal: AbortSignal;
  }): Promise<TripDetailViewModel>;
  getCover?(request: { readonly tripId: string; readonly signal: AbortSignal }): Promise<Blob>;
  manageTrip?(request: {
    readonly tripId: string;
    readonly action: TripManagementAction;
    readonly reason: string;
    readonly newOwnerMemberId?: string;
    readonly expectedPlanVersion: number;
    readonly expectedMembershipRevision: number;
    readonly expectedExportRevision: number;
    readonly idempotencyKey: string;
    readonly signal: AbortSignal;
  }): Promise<{ readonly action: TripManagementAction; readonly planVersion: number }>;
  listReminders?(request: {
    readonly tripId: string;
    readonly signal: AbortSignal;
  }): Promise<readonly PersonalReminder[]>;
  createReminder?(request: {
    readonly tripId: string;
    readonly sourceType: PersonalReminder['source_type'];
    readonly sourceId: string;
    readonly remindAt: string;
    readonly idempotencyKey: string;
    readonly signal: AbortSignal;
  }): Promise<PersonalReminder>;
  cancelReminder?(request: {
    readonly tripId: string;
    readonly reminderId: string;
    readonly signal: AbortSignal;
  }): Promise<PersonalReminder>;
  planPdf?(request: { readonly tripId: string; readonly signal: AbortSignal }): Promise<Blob>;
}
