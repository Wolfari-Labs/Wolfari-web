import type { GatewayHttpClient } from '../http/http-client';
import { ApiError } from '../http/api-error';
import type {
  Coordinate,
  ProviderMetadata,
  ProviderResult,
  Recommendation,
  RecommendationItem,
  TravelRepository,
} from '../../features/plan/model/travel';
const invalid = (): never => {
  throw new ApiError('Invalid Travel response', 'invalid-response', null, null, null, false);
};
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : invalid();
const string = (v: unknown): string => (typeof v === 'string' && v.trim() ? v : invalid());
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(string) : invalid());
const num = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : invalid();
const version = (v: unknown) => (Number.isSafeInteger(v) && Number(v) > 0 ? Number(v) : invalid());
const uuid = (v: unknown) =>
  /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(string(v)) ? String(v) : invalid();
const instant = (v: unknown) =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v))
    ? v
    : invalid();
const boolean = (v: unknown) => (typeof v === 'boolean' ? v : invalid());
export function decodeProvider(value: unknown): ProviderMetadata {
  const v = object(value);
  if (!['SUCCESS', 'NO_RESULT', 'ERROR'].includes(String(v.status))) invalid();
  return {
    status: v.status as ProviderMetadata['status'],
    provider: string(v.provider),
    fetchedAt: v.fetched_at === null ? null : instant(v.fetched_at),
    stale: boolean(v.stale),
    isMock: boolean(v.is_mock),
    warnings: strings(v.warnings),
  };
}
function providerResult<T>(
  value: unknown,
  decode: (data: unknown, meta: ProviderMetadata) => T,
): ProviderResult<T> {
  const v = object(value),
    meta = decodeProvider(v.meta);
  // The Gateway must never present a mocked provider payload as live information.
  if (meta.isMock || meta.status !== 'SUCCESS') return { meta, data: null };
  return { meta, data: decode(v.data, meta) };
}
function coordinate(v: unknown): Coordinate {
  const c = object(v);
  if (
    typeof c.latitude !== 'number' ||
    typeof c.longitude !== 'number' ||
    !Number.isFinite(c.latitude) ||
    !Number.isFinite(c.longitude) ||
    Math.abs(c.latitude) > 90 ||
    Math.abs(c.longitude) > 180
  )
    invalid();
  return { latitude: c.latitude as number, longitude: c.longitude as number };
}
export function decodeRecommendation(value: unknown, tripId: string): Recommendation {
  const v = object(value),
    p = object(v.proposal);
  if (
    v.trip_id !== tripId ||
    !['ROUTE_ORDER', 'PACKING_DRESS'].includes(String(v.type)) ||
    !Array.isArray(p.items) ||
    !Array.isArray(v.provider_sources)
  )
    invalid();
  const items = (p.items as unknown[]).map((raw) => {
    const i = object(raw);
    if (!['ACTIVITY', 'ROUTE_ORDER', 'DRESS_CODE', 'PACKING_ITEM'].includes(String(i.type)))
      invalid();
    const values = object(i.values);
    if (values.trip_id !== undefined && values.trip_id !== tripId) invalid();
    return {
      id: string(i.id),
      type: i.type as RecommendationItem['type'],
      values,
      reason: string(i.reason),
      ruleIds: strings(i.rule_ids),
      duplicateOf: i.duplicate_of === undefined ? [] : strings(i.duplicate_of),
    };
  });
  if (new Set(items.map((i) => i.id)).size !== items.length) invalid();
  return {
    id: uuid(v.id),
    tripId: uuid(v.trip_id),
    type: v.type as Recommendation['type'],
    basePlanVersion: version(v.base_plan_version),
    expiresAt: instant(v.expires_at),
    status: string(v.status),
    items,
    warnings: strings(v.warnings),
    providerSources: (v.provider_sources as unknown[]).map(decodeProvider),
    inputHash: string(v.input_hash),
    ruleVersion: string(v.rule_version),
  };
}
export function createTravelRepository(client: GatewayHttpClient): TravelRepository {
  const root = (tripId: string) => `/api/v1/trips/${encodeURIComponent(tripId)}`;
  return {
    async search(tripId, query, signal) {
      const response = await client.read(
        `/api/v1/travel/places?${new URLSearchParams({ trip_id: tripId, q: query })}`,
        { signal, includeCredentials: true },
      );
      return providerResult(response.data, (value, meta) => {
        if (!Array.isArray(value)) invalid();
        return (value as unknown[]).map((raw) => {
          const p = object(raw);
          const c = p.coordinates === null ? null : coordinate(p.coordinates);
          return {
            name: string(p.name),
            address: p.address === null ? null : string(p.address),
            latitude: c ? String(Number(c.latitude.toFixed(6))) : null,
            longitude: c ? String(Number(c.longitude.toFixed(6))) : null,
            provider: meta.provider,
            providerPlaceId: string(p.id),
            openingHours: p.opening_hours ?? null,
            fetchedAt: meta.fetchedAt,
          };
        });
      });
    },
    async route(tripId, coordinates, mode, signal) {
      const response = await client.write('/api/v1/travel/routes', {
        method: 'POST',
        body: { trip_id: tripId, coordinates, travel_mode: mode },
        signal,
        includeCredentials: true,
      });
      return providerResult(response.data, (value) => {
        const r = object(value);
        if (!Array.isArray(r.geometry) || r.geometry.length < 2) invalid();
        return {
          distanceM: num(r.distance_m),
          durationSeconds: num(r.duration_seconds),
          geometry: (r.geometry as unknown[]).map(coordinate),
        };
      });
    },
    async recommend(tripId, type, scope, expectedPlanVersion, signal) {
      const response = await client.write(`${root(tripId)}/recommendations`, {
        method: 'POST',
        body: { type, scope, expected_plan_version: expectedPlanVersion },
        signal,
        includeCredentials: true,
      });
      const result = decodeRecommendation(response.data, tripId);
      if (result.type !== type || result.basePlanVersion !== expectedPlanVersion) invalid();
      return result;
    },
    async getRecommendation(tripId, id, signal) {
      const response = await client.read(
        `${root(tripId)}/recommendations/${encodeURIComponent(id)}`,
        { signal, includeCredentials: true },
      );
      const result = decodeRecommendation(response.data, tripId);
      if (result.id !== id) invalid();
      return result;
    },
    async validateSchedule(tripId, expectedPlanVersion, signal) {
      const response = await client.write(`${root(tripId)}/schedule-validation`, {
        method: 'POST',
        body: { expected_plan_version: expectedPlanVersion },
        signal,
        includeCredentials: true,
      });
      const v = object(response.data);
      if (v.plan_version !== expectedPlanVersion || !Array.isArray(v.warnings)) invalid();
      return {
        planVersion: version(v.plan_version),
        warnings: (v.warnings as unknown[]).map((raw) => {
          const w = object(raw);
          return {
            code: string(w.code),
            message: string(w.message),
            activityIds: strings(w.activity_ids),
            missingMinutes: w.missing_minutes == null ? null : num(w.missing_minutes),
          };
        }),
        uncheckedRoutes: strings(v.unchecked_routes),
      };
    },
  };
}
