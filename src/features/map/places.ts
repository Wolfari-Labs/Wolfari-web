export type PlaceProvider = 'WOLFARI' | 'GEOAPIFY';
/** POI-OVERTURE §2.1: which dataset a result came from (Overture rows use provider WOLFARI). */
export type PlaceDataset = 'golden' | 'overture' | 'geoapify';
export interface PlaceImage {
  /** 1280 px WebP. */
  url: string;
  /** 640 px WebP (cards). */
  thumbnailUrl: string;
  /** 320 px WebP (small thumbnails). */
  smallUrl: string;
  width: number | null;
  height: number | null;
  author: string | null;
  license: string;
  licenseUrl: string | null;
  /** https file page (Wikimedia Commons) the credit links to. */
  sourceUrl: string;
  /** Credit line shown next to the photo, e.g. "Ảnh: An · CC BY-SA 4.0 · Wikimedia Commons". */
  attribution: string;
}

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
export function placeImage(value: unknown): PlaceImage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const r = value as Record<string, unknown>;
  const large = poiImagePath(r.url, 1280),
    medium = poiImagePath(r.thumbnail_url, 640),
    small = poiImagePath(r.small_url, 320);
  const sourceUrl = httpsLink(r.source_url);
  const attribution = typeof r.attribution === 'string' ? r.attribution.trim() : '';
  const license = r.license;
  if (
    !large ||
    !medium ||
    !small ||
    large.sha !== medium.sha ||
    large.sha !== small.sha ||
    !sourceUrl ||
    !/^https:\/\/commons\.wikimedia\.org\/wiki\/File:[^\s]+$/.test(sourceUrl) ||
    !attribution ||
    attribution.length > 300 ||
    typeof license !== 'string' ||
    !/^(?:CC0-1\.0|PD|CC-BY(?:-SA)?-\d+\.\d+)$/.test(license) ||
    r.is_placeholder !== false
  )
    return null;
  return {
    url: large.path,
    thumbnailUrl: medium.path,
    smallUrl: small.path,
    width: size(r.width),
    height: size(r.height),
    author: typeof r.author === 'string' && r.author.length <= 200 ? r.author.trim() || null : null,
    license,
    licenseUrl: httpsLink(r.license_url, true),
    sourceUrl,
    attribution,
  };
}

export interface DiscoveredPlace {
  id: string;
  name: string;
  address: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  token: string;
  attribution: string;
  /** Older backends omit it; their results are Geoapify. */
  provider: PlaceProvider;
  categories: readonly string[];
  /** Wolfari taxonomy code and Vietnamese label (curated store only). */
  category: string | null;
  categoryLabel: string | null;
  /** 1–3 curated, 9 provider/import. */
  tier: number | null;
  /** `false` = coordinates not yet checked by a person; `null` = unknown. */
  coordVerified: boolean | null;
  typicalDurationMin: number | null;
  activityType: string | null;
  dressCodeHint: string | null;
  /** POI-OVERTURE additive fields; all optional for older backends. */
  sourceDataset: PlaceDataset | null;
  categoryGroup: string | null;
  provinceCode: string | null;
  /** Backend display name; preferred over the local code table. */
  provinceName: string | null;
  confidence: number | null;
  dataRelease: string | null;
  fetchedAt: string | null;
  heroImage?: PlaceImage | null;
}
export type RouteMode = 'DRIVING' | 'WALKING' | 'CYCLING';
export interface PlaceRoute {
  distanceM: number;
  durationSeconds: number;
  geometry: readonly { latitude: number; longitude: number }[];
  source?: import('../../infrastructure/http/envelope').GatewayMetadata['travelSource'];
}
export interface PlaceIntent {
  path: string;
  method: 'POST' | 'DELETE' | 'PATCH';
  body: Record<string, unknown>;
  key: string;
}
export function validPlaceIntent(value: unknown, tripId: string): value is PlaceIntent {
  if (!value || typeof value !== 'object') return false;
  const p = value as PlaceIntent;
  const base = `/api/v1/trips/${tripId}/`;
  const uuid = '[0-9a-fA-F-]{36}';
  return (
    typeof p.key === 'string' &&
    /^[0-9a-f-]{36}$/i.test(p.key) &&
    !!p.body &&
    typeof p.body === 'object' &&
    !Array.isArray(p.body) &&
    Number.isInteger(p.body.expected_plan_version) &&
    Number(p.body.expected_plan_version) > 0 &&
    ((p.method === 'POST' && [base + 'selected-locations', base + 'activities'].includes(p.path)) ||
      (p.method === 'DELETE' && new RegExp(`^${base}selected-locations/${uuid}$`).test(p.path)) ||
      (p.method === 'PATCH' && new RegExp(`^${base}activities/${uuid}$`).test(p.path)))
  );
}

/** Plan activity types the Web UI labels; anything else shows as "Khác". */
const activityTypeLabels: Record<string, string> = {
  SIGHTSEEING: 'Tham quan',
  BEACH: 'Biển',
  TEMPLE: 'Đền chùa',
  CHURCH: 'Nhà thờ',
  MUSEUM: 'Bảo tàng',
  SHOPPING: 'Mua sắm',
  FOOD: 'Ẩm thực',
  MEAL: 'Ẩm thực',
  WALKING: 'Đi dạo',
  WALK: 'Đi dạo',
  ENTERTAINMENT: 'Giải trí',
  SHOW: 'Biểu diễn',
  CULTURE: 'Văn hóa',
  OUTDOOR: 'Ngoài trời',
};
export function activityTypeLabel(value: string | null | undefined) {
  return (value && activityTypeLabels[value.toUpperCase()]) || 'Khác';
}
/** Activity type sent when adding a place to a day; Plan accepts ≤ 40 characters. */
export function placeActivityType(place: Pick<DiscoveredPlace, 'activityType'> | null) {
  const value = place?.activityType?.trim().toUpperCase();
  return value && /^[A-Z_]{1,40}$/.test(value) ? value : 'SIGHTSEEING';
}
export function placeSourceLabel(provider: string | null | undefined) {
  const value = provider?.toUpperCase();
  return value === 'WOLFARI' ? 'Wolfari' : value === 'GEOAPIFY' ? 'Geoapify' : 'Thủ công';
}

/** Dataset of a search result; older backends omit it, so fall back to the provider. */
export function placeDataset(
  place: Pick<DiscoveredPlace, 'sourceDataset' | 'provider'>,
): PlaceDataset {
  return place.sourceDataset ?? (place.provider === 'WOLFARI' ? 'golden' : 'geoapify');
}
/**
 * Dataset of a saved location. Overture `wolfari_key`s are `ov-<gers id>` (stored as
 * `provider_place_id`); an Overture attribution is only a fallback for older rows.
 */
export function savedLocationDataset(location: {
  source: string;
  provider: string | null;
  providerPlaceId?: string | null;
  metadata: Readonly<Record<string, unknown>>;
}): PlaceDataset | 'manual' {
  if (location.source === 'MANUAL' || !location.provider) return 'manual';
  if (location.provider.toUpperCase() === 'GEOAPIFY') return 'geoapify';
  if (location.providerPlaceId?.startsWith('ov-')) return 'overture';
  const attribution = location.metadata.attribution;
  return typeof attribution === 'string' && /overture/i.test(attribution) ? 'overture' : 'golden';
}
export function placeDatasetLabel(dataset: PlaceDataset | 'manual') {
  return dataset === 'golden'
    ? 'Wolfari'
    : dataset === 'overture'
      ? 'Overture'
      : dataset === 'geoapify'
        ? 'Geoapify'
        : 'Thủ công';
}
export const OVERTURE_NOTE = 'Dữ liệu mở từ Overture Maps Foundation, nhóm chưa kiểm tay';

/** Wolfari taxonomy (MAP-POI §8 + POI-OVERTURE §2.1); the API `category_label` wins. */
const categoryLabels: Record<string, string> = {
  museum: 'Bảo tàng',
  historic: 'Di tích',
  attraction: 'Điểm tham quan',
  viewpoint: 'Điểm ngắm cảnh',
  park: 'Công viên',
  beach: 'Bãi biển',
  temple: 'Đền, chùa và nơi thờ tự',
  gallery: 'Phòng trưng bày',
  zoo: 'Vườn thú và thủy cung',
  theme_park: 'Khu vui chơi lớn',
  old_quarter: 'Phố cổ và khu di sản đô thị',
  craft_village: 'Làng nghề',
  market: 'Chợ',
  nature_area: 'Khu thiên nhiên',
  performance_venue: 'Điểm biểu diễn văn hóa',
  restaurant: 'Nhà hàng',
  cafe: 'Cà phê',
  food_street: 'Khu ẩm thực',
  water_park: 'Công viên nước',
  playground: 'Sân chơi',
  walking_street: 'Phố đi bộ và đường dạo',
  bridge: 'Cầu tham quan',
  cave: 'Hang động',
  waterfall: 'Thác nước',
  campground: 'Khu cắm trại',
  trailhead: 'Điểm bắt đầu đường mòn',
  accommodation: 'Lưu trú',
  bar_nightlife: 'Bar và giải trí đêm',
  shopping: 'Mua sắm',
  entertainment: 'Giải trí',
  sports_recreation: 'Thể thao và vận động',
  wellness: 'Spa, massage và chăm sóc',
  transport_hub: 'Sân bay, ga, bến xe, bến tàu',
  traveler_service: 'Tiện ích cho khách',
  other: 'Khác',
};
export function placeCategoryLabel(code: string | null | undefined, apiLabel?: string | null) {
  return apiLabel?.trim() || knownCategoryLabel(code) || 'Khác';
}
/** Label for a Wolfari taxonomy code, or null for provider codes such as `tourism.sights`. */
export function knownCategoryLabel(code: string | null | undefined) {
  return (code && categoryLabels[code.toLowerCase()]) || null;
}

/**
 * Plan activity type per taxonomy code, used only when the catalogue's own `activity_type`
 * is unavailable (a saved place that is not in the current results).
 */
const categoryActivityTypes: Record<string, string> = {
  museum: 'MUSEUM',
  gallery: 'MUSEUM',
  historic: 'CULTURE',
  old_quarter: 'CULTURE',
  craft_village: 'CULTURE',
  temple: 'TEMPLE',
  beach: 'BEACH',
  market: 'SHOPPING',
  shopping: 'SHOPPING',
  restaurant: 'FOOD',
  cafe: 'FOOD',
  food_street: 'FOOD',
  walking_street: 'WALKING',
  park: 'OUTDOOR',
  nature_area: 'OUTDOOR',
  cave: 'OUTDOOR',
  waterfall: 'OUTDOOR',
  campground: 'OUTDOOR',
  trailhead: 'OUTDOOR',
  sports_recreation: 'OUTDOOR',
  theme_park: 'ENTERTAINMENT',
  water_park: 'ENTERTAINMENT',
  zoo: 'ENTERTAINMENT',
  playground: 'ENTERTAINMENT',
  entertainment: 'ENTERTAINMENT',
  bar_nightlife: 'ENTERTAINMENT',
  performance_venue: 'SHOW',
};
/** Activity type for a saved place: catalogue value first, then its first known taxonomy code. */
export function savedPlaceActivityType(
  result: Pick<DiscoveredPlace, 'activityType'> | null,
  metadata: Readonly<Record<string, unknown>>,
) {
  if (result?.activityType) return placeActivityType(result);
  const categories = Array.isArray(metadata.categories) ? metadata.categories : [];
  for (const code of categories) {
    const type = typeof code === 'string' ? categoryActivityTypes[code.toLowerCase()] : undefined;
    if (type) return type;
  }
  return 'SIGHTSEEING';
}

/** Map filter chips (POI-OVERTURE W11). No chip = backend default groups. */
export const PLACE_GROUPS = [
  { value: 'tourism', label: 'Du lịch' },
  { value: 'restaurant', label: 'Ăn uống' },
  { value: 'cafe', label: 'Cà phê' },
  { value: 'accommodation', label: 'Lưu trú' },
  { value: 'nightlife', label: 'Bar' },
  { value: 'shopping', label: 'Mua sắm' },
  { value: 'entertainment', label: 'Giải trí' },
  { value: 'wellness', label: 'Spa' },
  { value: 'transport', label: 'Giao thông' },
  { value: 'services', label: 'Tiện ích' },
  { value: 'all', label: 'Mọi nhóm' },
] as const;
export type PlaceGroup = (typeof PLACE_GROUPS)[number]['value'];
export function parsePlaceGroup(value: string | null | undefined): PlaceGroup | null {
  return PLACE_GROUPS.find((group) => group.value === value)?.value ?? null;
}

export interface MapBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}
const round = (value: number, digits: number) => Number(value.toFixed(digits));
/** `minLon,minLat,maxLon,maxLat`. */
export function bboxText(bounds: MapBounds, digits = 6) {
  return [bounds.west, bounds.south, bounds.east, bounds.north]
    .map((value) => round(value, digits))
    .join(',');
}
/** Query for `GET places/search`: keyword mode keeps radius/geocode; explore mode sends `bbox`. */
export function placeSearchParams(
  input:
    | {
        mode: 'query';
        query: string;
        center: { latitude: number; longitude: number };
        group: PlaceGroup | null;
        geocode: boolean;
      }
    | { mode: 'bbox'; bounds: MapBounds; group: PlaceGroup | null; limit?: number },
) {
  const params = new URLSearchParams();
  if (input.mode === 'query') {
    params.set('q', input.query);
    if (input.group) params.set('category', input.group);
    params.set('geocode', String(input.geocode));
    params.set('latitude', String(input.center.latitude));
    params.set('longitude', String(input.center.longitude));
    params.set('radius_m', '5000');
  } else {
    if (input.group) params.set('category', input.group);
    params.set('bbox', bboxText(input.bounds));
    params.set('limit', String(input.limit ?? 150));
  }
  return params;
}

/** Vietnamese provinces after the 2025 merger (34 units); unknown codes are not shown. */
const provinceNames: Record<string, string> = {
  '01': 'Hà Nội',
  '04': 'Cao Bằng',
  '08': 'Tuyên Quang',
  '11': 'Điện Biên',
  '12': 'Lai Châu',
  '14': 'Sơn La',
  '15': 'Lào Cai',
  '19': 'Thái Nguyên',
  '20': 'Lạng Sơn',
  '22': 'Quảng Ninh',
  '24': 'Bắc Ninh',
  '25': 'Phú Thọ',
  '31': 'Hải Phòng',
  '33': 'Hưng Yên',
  '37': 'Ninh Bình',
  '38': 'Thanh Hóa',
  '40': 'Nghệ An',
  '42': 'Hà Tĩnh',
  '44': 'Quảng Trị',
  '46': 'Huế',
  '48': 'Đà Nẵng',
  '51': 'Quảng Ngãi',
  '52': 'Gia Lai',
  '56': 'Khánh Hòa',
  '66': 'Đắk Lắk',
  '68': 'Lâm Đồng',
  '75': 'Đồng Nai',
  '79': 'TP. Hồ Chí Minh',
  '80': 'Tây Ninh',
  '82': 'Đồng Tháp',
  '86': 'Vĩnh Long',
  '91': 'An Giang',
  '92': 'Cần Thơ',
  '96': 'Cà Mau',
};
export function provinceName(code: string | null | undefined) {
  return (
    (code && /^\d{1,2}$/.test(code.trim()) && provinceNames[code.trim().padStart(2, '0')]) || null
  );
}

/** `dd/MM/yyyy` for a `YYYY-MM-DD[.n]` release tag or an ISO timestamp (Vietnam time). */
export function placeDate(value: string | null | undefined) {
  if (!value) return null;
  const tag = /^(\d{4})-(\d{2})-(\d{2})(?:\.\d+)?$/.exec(value.trim());
  if (tag) return `${tag[3]}/${tag[2]}/${tag[1]}`;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(new Date(time));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')}`;
}

/** What the detail panel shows about where a place record comes from (FR-TI01). */
export interface PlaceProvenance {
  dataset: PlaceDataset | 'manual';
  categoryLabel: string | null;
  provinceName: string | null;
  dataRelease: string | null;
  fetchedAt: string | null;
  attribution: string | null;
  coordVerified: boolean | null;
}
export function resultProvenance(place: DiscoveredPlace): PlaceProvenance {
  return {
    dataset: placeDataset(place),
    // Older Geoapify payloads carry neither field; the row then keeps its previous fallback.
    categoryLabel:
      place.category || place.categoryLabel
        ? placeCategoryLabel(place.category, place.categoryLabel)
        : null,
    provinceName: place.provinceName ?? provinceName(place.provinceCode),
    dataRelease: placeDate(place.dataRelease),
    fetchedAt: placeDate(place.fetchedAt),
    attribution: place.attribution || null,
    coordVerified: place.coordVerified,
  };
}
export function savedProvenance(location: {
  source: string;
  provider: string | null;
  providerPlaceId?: string | null;
  fetchedAt: string | null;
  metadata: Readonly<Record<string, unknown>>;
}): PlaceProvenance {
  const categories = Array.isArray(location.metadata.categories)
    ? location.metadata.categories
    : [];
  const label = location.metadata.category_label;
  const attribution = location.metadata.attribution;
  return {
    dataset: savedLocationDataset(location),
    categoryLabel:
      (typeof label === 'string' && label.trim()) ||
      categories
        .map((code) => (typeof code === 'string' ? knownCategoryLabel(code) : null))
        .find(Boolean) ||
      null,
    provinceName: null,
    dataRelease: null,
    fetchedAt: placeDate(location.fetchedAt),
    attribution: typeof attribution === 'string' && attribution.trim() ? attribution : null,
    coordVerified: null,
  };
}

/** Explore mode (W12): below this zoom the map frame is too wide to load places. */
export const EXPLORE_MIN_ZOOM = 11;
export const EXPLORE_LIMIT = 150;
/** Cache key for a bbox query: bbox rounded to 3 decimals + chip group. */
export function exploreCacheKey(bounds: MapBounds, group: PlaceGroup | null) {
  return `${bboxText(bounds, 3)}|${group ?? ''}`;
}
/** Small in-memory LRU (W12: at most 30 bbox results); never persisted. */
export class LruCache<V> {
  private readonly entries = new Map<string, V>();
  constructor(private readonly max = 30) {}
  get(key: string) {
    const value = this.entries.get(key);
    if (value !== undefined) {
      this.entries.delete(key);
      this.entries.set(key, value);
    }
    return value;
  }
  set(key: string, value: V) {
    this.entries.delete(key);
    this.entries.set(key, value);
    while (this.entries.size > this.max) this.entries.delete(this.entries.keys().next().value!);
  }
  get size() {
    return this.entries.size;
  }
}

/**
 * W13 list footer: only the sources present in the results, Overture with its release.
 * Returns null when there is nothing to credit.
 */
export function placeDataCredit(
  places: readonly Pick<DiscoveredPlace, 'sourceDataset' | 'provider' | 'dataRelease'>[],
  metaRelease?: string | null,
) {
  const datasets = new Set(places.map(placeDataset));
  const release =
    metaRelease ??
    places.find((p) => placeDataset(p) === 'overture' && p.dataRelease)?.dataRelease ??
    null;
  const parts = [
    datasets.has('golden') && 'Wolfari',
    datasets.has('overture') && `Overture Maps Foundation${release ? ` (bản ${release})` : ''}`,
    datasets.has('geoapify') && 'Geoapify / © OpenStreetMap contributors',
  ].filter((part): part is string => !!part);
  return parts.length ? `Dữ liệu địa điểm: ${parts.join(', ')}` : null;
}

/** Search response meta as the map consumes it (additive POI-OVERTURE fields optional). */
export interface PlacesSource {
  provider: string;
  status: string;
  stale: boolean;
  fetchedAt: string | null;
  warnings: string[];
  snapshotId?: string | null;
  dataRelease?: string | null;
  bboxTruncated?: boolean;
}
export interface PlacesFound {
  items: DiscoveredPlace[];
  source: PlacesSource;
}
/** Explore (bbox) outcome; transport errors still throw. */
export type PlacesExplore =
  ({ kind: 'found' } & PlacesFound) | { kind: 'too-large' } | { kind: 'unsupported' };

const EARTH_KM = 6371;
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad,
    dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}
/**
 * W14: province of the map centre, taken from the nearest result that carries a province code
 * within `maxKm`; null when no result is close enough to tell.
 */
export function centerProvinceCode(
  places: readonly Pick<DiscoveredPlace, 'latitude' | 'longitude' | 'provinceCode'>[],
  center: { latitude: number; longitude: number },
  maxKm = 15,
) {
  let best: { code: string; km: number } | null = null;
  for (const place of places) {
    if (!place.provinceCode) continue;
    const km = distanceKm(center, place);
    if (km <= maxKm && (!best || km < best.km)) best = { code: place.provinceCode, km };
  }
  return best?.code ?? null;
}
/** W14: province shown beside the address only when it differs from the map centre's. */
export function otherProvinceName(
  place: Pick<DiscoveredPlace, 'provinceCode'> & { provinceName?: string | null },
  centerProvince: string | null,
) {
  if (!centerProvince || !place.provinceCode) return null;
  if (Number(place.provinceCode) === Number(centerProvince)) return null;
  return place.provinceName ?? provinceName(place.provinceCode);
}
