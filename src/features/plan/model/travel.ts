import type { LocationWrite } from './preparation';
export interface ProviderMetadata {
  status: 'SUCCESS' | 'NO_RESULT' | 'ERROR';
  provider: string;
  fetchedAt: string | null;
  stale: boolean;
  isMock: boolean;
  warnings: string[];
}
export interface ProviderResult<T> {
  data: T | null;
  meta: ProviderMetadata;
}
export interface Coordinate {
  latitude: number;
  longitude: number;
}
export interface RouteResult {
  distanceM: number;
  durationSeconds: number;
  geometry: Coordinate[];
}
export interface PlaceCandidate extends LocationWrite {
  provider: string;
  providerPlaceId: string;
}
export type RecommendationType = 'ROUTE_ORDER' | 'PACKING_DRESS';
export interface RecommendationItem {
  id: string;
  type: 'ACTIVITY' | 'ROUTE_ORDER' | 'DRESS_CODE' | 'PACKING_ITEM';
  values: Record<string, unknown>;
  reason: string;
  ruleIds: string[];
  duplicateOf: string[];
}
export interface Recommendation {
  id: string;
  tripId: string;
  type: RecommendationType;
  basePlanVersion: number;
  expiresAt: string;
  status: string;
  items: RecommendationItem[];
  warnings: string[];
  providerSources: ProviderMetadata[];
  inputHash: string;
  ruleVersion: string;
}
export interface RecommendationScope {
  date?: string;
  selected_location_ids?: string[];
  activity_ids?: string[];
}
export interface ScheduleWarnings {
  planVersion: number;
  warnings: {
    code: string;
    activityIds: string[];
    message: string;
    missingMinutes: number | null;
  }[];
  uncheckedRoutes: string[];
}
export interface TravelRepository {
  search(
    tripId: string,
    query: string,
    signal: AbortSignal,
  ): Promise<ProviderResult<PlaceCandidate[]>>;
  route(
    tripId: string,
    coordinates: Coordinate[],
    mode: 'WALKING' | 'DRIVING' | 'CYCLING',
    signal: AbortSignal,
  ): Promise<ProviderResult<RouteResult>>;
  recommend(
    tripId: string,
    type: RecommendationType,
    scope: RecommendationScope,
    version: number,
    signal: AbortSignal,
  ): Promise<Recommendation>;
  getRecommendation(tripId: string, id: string, signal: AbortSignal): Promise<Recommendation>;
  validateSchedule(tripId: string, version: number, signal: AbortSignal): Promise<ScheduleWarnings>;
}
