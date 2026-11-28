import type { GatewayHttpClient } from '../http/http-client';
import { ApiError } from '../http/api-error';
import * as d from '../http/decode';
import type {
  DiscoveredPlace,
  PlaceDataset,
  PlaceImage,
  PlacesExplore,
  PlacesFound,
  PlaceIntent,
  PlaceProvider,
  PlaceRoute,
} from '../../features/map/places';

const optionalText = (value: unknown, max = 255) =>
  typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : null;

const POI_IMAGE = /^\/api\/v1\/travel\/poi-images\/([0-9a-f]{64})\/(320|640|1280)\.webp$/;
/** A Gateway POI image path of the given width (relative, or absolute on this origin), else null. */
function poiImagePath(
  value: unknown,
  width: 320 | 640 | 1280,
): { path: string; sha: string } | null {
  if (typeof value !== 'string' || !value || value.length > 300) return null;
  let url: URL;
  try {
    url = new URL(value, window.location.origin);
  } catch {
    return null;
  }
  const match = POI_IMAGE.exec(url.pathname);
  if (
    url.origin !== window.location.origin ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !match ||
    match[2] !== String(width)
  )
    return null;
  return { path: url.pathname, sha: match[1]! };
}
const size = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 20000
    ? value
    : null;
const httpsLink = (value: unknown, http = false) => {
  if (typeof value !== 'string' || value.length > 2000) return null;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || (http && url.protocol === 'http:')) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
};
/**
 * POI-IMAGES `hero_image`. All three variants must be this Gateway's image route for one and the
 * same file, with a credit and a source page; anything else (or a placeholder) means no photo.
 */
export function decodePlaceImage(value: unknown): PlaceImage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const r = value as Record<string, unknown>;
  const large = poiImagePath(r.url, 1280),
    medium = poiImagePath(r.thumbnail_url, 640),
    small = poiImagePath(r.small_url, 320);
  const sourceUrl = httpsLink(r.source_url);
  const attribution = optionalText(r.attribution, 300),
    license = optionalText(r.license, 40);
  if (
    !large ||
    !medium ||
    !small ||
    large.sha !== medium.sha ||
    large.sha !== small.sha ||
    !sourceUrl ||
    !attribution ||
    !license ||
    r.is_placeholder !== false
  )
    return null;
  return {
    url: large.path,
    thumbnailUrl: medium.path,
    smallUrl: small.path,
    width: size(r.width),
    height: size(r.height),
    author: optionalText(r.author, 200),
    license,
    licenseUrl: httpsLink(r.license_url, true),
    sourceUrl,
    attribution,
  };
}
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
    sourceDataset: datasets.includes(p.source_dataset as PlaceDataset)
      ? (p.source_dataset as PlaceDataset)
      : null,
    categoryGroup: optionalText(p.category_group, 40),
    provinceCode:
      typeof p.province_code === 'string' && /^\d{1,3}$/.test(p.province_code.trim())
        ? p.province_code.trim()
        : null,
    provinceName: optionalText(p.province_name, 80),
    confidence:
      typeof p.confidence === 'number' &&
      Number.isFinite(p.confidence) &&
      p.confidence >= 0 &&
      p.confidence <= 1
        ? p.confidence
        : null,
    dataRelease: optionalText(p.data_release, 40),
    fetchedAt:
      typeof p.fetched_at === 'string' && Number.isFinite(Date.parse(p.fetched_at))
        ? p.fetched_at
        : null,
    heroImage: decodePlaceImage(p.hero_image),
  };
}
const datasets: readonly PlaceDataset[] = ['golden', 'overture', 'geoapify'];
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
  const search = async (
    tripId: string,
    params: URLSearchParams,
    signal: AbortSignal,
  ): Promise<PlacesFound> => {
    const result = await client.read(
      `/api/v1/trips/${encodeURIComponent(tripId)}/places/search?${params}`,
      { signal },
    );
    if (!Array.isArray(result.data) || !result.metadata?.placesSource)
      throw Error('Invalid places response');
    return { items: result.data.map(decodePlace), source: result.metadata.placesSource };
  };
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
    search,
    /**
     * POI-OVERTURE W12 bbox query. `BBOX_TOO_LARGE` asks the user to zoom in; any other 400
     * except `INVALID_BBOX` means the backend predates bbox support (keep the old behaviour).
     */
    async explore(
      tripId: string,
      params: URLSearchParams,
      signal: AbortSignal,
    ): Promise<PlacesExplore> {
      try {
        return { kind: 'found', ...(await search(tripId, params, signal)) };
      } catch (error) {
        if (error instanceof ApiError && error.kind === 'http') {
          if (error.code === 'BBOX_TOO_LARGE') return { kind: 'too-large' };
          if (error.status === 400 && error.code !== 'INVALID_BBOX') return { kind: 'unsupported' };
        }
        throw error;
      }
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
