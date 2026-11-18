import type { GatewayHttpClient } from '../http/http-client';
import * as d from '../http/decode';
import type {
  DiscoveredPlace,
  PlaceIntent,
  PlaceProvider,
  PlaceRoute,
} from '../../features/map/places';

const optionalText = (value: unknown, max = 255) =>
  typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : null;

/** Additive MAP-POI fields are optional: a malformed extra never drops the whole result. */
export function decodePlace(value: unknown): DiscoveredPlace {
  const p = d.object(value),
    c = d.object(p.coordinates);
  if (
    typeof c.latitude !== 'number' ||
    !Number.isFinite(c.latitude) ||
    Math.abs(c.latitude) > 90 ||
    typeof c.longitude !== 'number' ||
    !Number.isFinite(c.longitude) ||
    Math.abs(c.longitude) > 180
  )
    throw Error('Invalid coordinates');
  const provider: PlaceProvider = p.provider === 'WOLFARI' ? 'WOLFARI' : 'GEOAPIFY';
  const tier =
    typeof p.tier === 'number' && [1, 2, 3, 9].includes(p.tier) ? (p.tier as number) : null;
  const duration =
    typeof p.typical_duration_min === 'number' &&
    Number.isInteger(p.typical_duration_min) &&
    p.typical_duration_min > 0 &&
    p.typical_duration_min <= 24 * 60
      ? p.typical_duration_min
      : null;
  return {
    id: d.string(p.id),
    name: d.string(p.name),
    address: typeof p.address === 'string' ? p.address : '',
    latitude: c.latitude,
    longitude: c.longitude,
    token: d.string(p.selection_token),
    attribution: d.string(p.attribution),
    provider,
    categories: Array.isArray(p.categories)
      ? p.categories.filter((item): item is string => typeof item === 'string')
      : [],
    category: optionalText(p.category, 40),
    categoryLabel: optionalText(p.category_label, 80),
    tier,
    coordVerified: typeof p.coord_verified === 'boolean' ? p.coord_verified : null,
    typicalDurationMin: duration,
    activityType: optionalText(p.activity_type, 40),
    dressCodeHint: optionalText(p.dress_code_hint, 120),
  };
}
function coordinate(value: unknown) {
  const c = d.object(value);
  if (
    typeof c.latitude !== 'number' ||
    typeof c.longitude !== 'number' ||
    !Number.isFinite(c.latitude) ||
    !Number.isFinite(c.longitude) ||
    Math.abs(c.latitude) > 90 ||
    Math.abs(c.longitude) > 180
  )
    throw Error('Invalid route coordinate');
  return { latitude: c.latitude, longitude: c.longitude };
}
/** Contract 4.4 response body (`data`). */
export function decodeRoute(value: unknown): PlaceRoute {
  const r = d.object(value);
  if (
    typeof r.distance_m !== 'number' ||
    typeof r.duration_seconds !== 'number' ||
    !Number.isFinite(r.distance_m) ||
    !Number.isFinite(r.duration_seconds) ||
    r.distance_m < 0 ||
    r.duration_seconds < 0 ||
    !Array.isArray(r.geometry) ||
    r.geometry.length < 2
  )
    throw Error('Invalid route response');
  return {
    distanceM: r.distance_m,
    durationSeconds: r.duration_seconds,
    geometry: r.geometry.map(coordinate),
  };
}
export function createPlacesRepository(client: GatewayHttpClient) {
  return {
    /** OSRM car estimate between ordered stops; 503 when routing is not available. */
    async route(
      coordinates: readonly { latitude: number; longitude: number }[],
      signal: AbortSignal,
    ) {
      const result = await client.write('/api/v1/travel/route', {
        method: 'POST',
        body: { coordinates, mode: 'DRIVING' },
        signal,
      });
      return decodeRoute(result.data);
    },
    async search(tripId: string, params: URLSearchParams, signal: AbortSignal) {
      const result = await client.read(
        `/api/v1/trips/${encodeURIComponent(tripId)}/places/search?${params}`,
        { signal },
      );
      if (!Array.isArray(result.data) || !result.metadata?.placesSource)
        throw Error('Invalid places response');
      return { items: result.data.map(decodePlace), source: result.metadata.placesSource };
    },
    async command(intent: PlaceIntent, signal: AbortSignal) {
      const result = await client.write(intent.path, {
        method: intent.method,
        body: intent.body,
        idempotencyKey: intent.key,
        signal,
      });
      return d.object(result.data);
    },
  };
}
