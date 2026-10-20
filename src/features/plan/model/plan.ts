import type { ReadResult } from '../../../shared/types/result';
export const planScenarios = [
  'success',
  'read-only',
  'loading',
  'empty',
  'error',
  'forbidden',
  'not-found',
  'conflict',
  'unavailable',
] as const;
export type PlanScenario = (typeof planScenarios)[number];
export interface ActivityViewModel {
  readonly id: string;
  readonly tripId: string;
  readonly title: string;
  readonly description: string | null;
  readonly publicDescription: string | null;
  readonly activityType: string;
  readonly selectedLocationId: string | null;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly position: number;
  readonly status: 'TODO' | 'COMPLETED';
  readonly source: 'MANUAL' | 'PROVIDER' | 'DSS';
  readonly planVersion: number;
  readonly createdByUserId: string;
  readonly completedByUserId: string | null;
  readonly completedAt: string | null;
  readonly presentation: { readonly cover: { readonly src: string; readonly alt: string } | null };
}
export interface SelectedLocationViewModel {
  readonly id: string;
  readonly tripId: string;
  readonly name: string;
  readonly address: string | null;
  readonly latitude: string | null;
  readonly longitude: string | null;
  readonly provider: string | null;
  readonly providerPlaceId: string | null;
  readonly source: 'MANUAL' | 'PROVIDER' | 'DSS';
  readonly openingHours: unknown | null;
  readonly fetchedAt: string | null;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly planVersion: number;
}
export interface DressCodeViewModel {
  readonly id: string;
  readonly tripId: string;
  readonly scopeType: 'TRIP' | 'DAY' | 'ACTIVITY';
  readonly planDate: string | null;
  readonly activityId: string | null;
  readonly label: string;
  readonly description: string | null;
  readonly publicDescription: string | null;
  readonly source: 'MANUAL' | 'PROVIDER' | 'DSS';
  readonly planVersion: number;
}
export interface PackingItemViewModel {
  readonly id: string;
  readonly tripId: string;
  readonly name: string;
  readonly quantity: string;
  readonly unit: string | null;
  readonly note: string | null;
  readonly category: string | null;
  readonly assignedMemberId: string | null;
  readonly dueAt: string | null;
  readonly status: 'TODO' | 'COMPLETED';
  readonly source: 'MANUAL' | 'PROVIDER' | 'DSS';
  readonly completedByUserId: string | null;
  readonly completedAt: string | null;
  readonly planVersion: number;
}
export interface PlanViewModel {
  readonly tripId: string;
  readonly planVersion: number;
  readonly exportRevision: number;
  readonly activities: readonly ActivityViewModel[];
  readonly selectedLocations: readonly SelectedLocationViewModel[];
  readonly dressCodes: readonly DressCodeViewModel[];
  readonly packingItems: readonly PackingItemViewModel[];
  readonly permissions: {
    readonly canRead: boolean;
    readonly canEdit: boolean;
    readonly canComplete: boolean;
  };
}
export interface PlanRepository {
  getPlan(request: {
    readonly tripId: string;
    readonly scenario: PlanScenario;
    readonly signal: AbortSignal;
  }): Promise<ReadResult<PlanViewModel>>;
}
// Reserved verified command metadata. Phase 3 deliberately exposes no write method.
export interface PlanWriteIntent {
  readonly idempotencyKey: string;
  readonly expectedPlanVersion: number;
}
