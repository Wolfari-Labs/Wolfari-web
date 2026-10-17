import type { ReadResult } from '../../../shared/types/result';

/** Price values stay decimal integer strings at the Web boundary. */
export type MoneyVnd = string;

export const priceWatchScenarios = [
  'success',
  'created',
  'paused',
  'stale',
  'provider-error',
  'read-only',
  'loading',
  'empty',
  'error',
  'forbidden',
  'not-found',
  'conflict',
  'unavailable',
] as const;
export type PriceWatchScenario = (typeof priceWatchScenarios)[number];

export const watchStatuses = ['ACTIVE', 'PAUSED', 'STALE', 'PROVIDER_ERROR'] as const;
export type WatchStatus = (typeof watchStatuses)[number];

export const journeyTypes = ['ONE_WAY', 'ROUND_TRIP'] as const;
export type JourneyType = (typeof journeyTypes)[number];

export const cabinClasses = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS'] as const;
export type CabinClass = (typeof cabinClasses)[number];

export type ObservationStatus = 'OBSERVED' | 'STALE' | 'PROVIDER_ERROR';

export interface PriceObservation {
  readonly id: string;
  readonly observedAt: string;
  readonly priceVnd: MoneyVnd | null;
  readonly status: ObservationStatus;
  readonly provider: string;
  readonly note: string | null;
}

export interface PriceWatchMemberPresentation {
  readonly displayName: string | null;
  readonly avatar: { readonly src: string; readonly alt: string } | null;
}

export interface PriceWatchItem {
  readonly id: string;
  readonly tripId: string;
  readonly ownerUserId: string;
  readonly owner: PriceWatchMemberPresentation;
  readonly origin: string;
  readonly destination: string;
  readonly journeyType: JourneyType;
  readonly departureDate: string;
  readonly returnDate: string | null;
  readonly passengers: number;
  readonly cabin: CabinClass;
  readonly thresholdVnd: MoneyVnd;
  /** Retained when a provider fails; never represented as zero. */
  readonly latestPriceVnd: MoneyVnd | null;
  readonly currency: 'VND';
  readonly provider: string;
  readonly observedAt: string | null;
  readonly status: WatchStatus;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly selfOwned: boolean;
  readonly observations: readonly PriceObservation[];
}

export interface PriceWatchPermissions {
  readonly canRead: boolean;
  readonly canCreate: boolean;
  readonly canEditOwn: boolean;
  readonly canPauseOwn: boolean;
  readonly canResumeOwn: boolean;
  readonly canDeleteOwn: boolean;
  readonly canDeleteAny: boolean;
}

export interface PriceWatchViewModel {
  readonly tripId: string;
  readonly providerEnvironment: 'TEST' | 'SANDBOX';
  readonly watches: readonly PriceWatchItem[];
  readonly permissions: PriceWatchPermissions;
  readonly watchVersion: number;
}

export interface PriceWatchRepository {
  getPriceWatch(request: {
    readonly tripId: string;
    readonly scenario: PriceWatchScenario;
    readonly signal: AbortSignal;
  }): Promise<ReadResult<PriceWatchViewModel>>;
}

export function isMoneyVnd(value: string): value is MoneyVnd {
  return /^(?:0|[1-9]\d*)$/.test(value.trim());
}

export function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}
