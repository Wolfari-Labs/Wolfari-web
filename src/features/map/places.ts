export type PlaceProvider = 'WOLFARI' | 'GEOAPIFY';
export interface DiscoveredPlace {
  id: string;
  name: string;
  address: string;
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
}
export interface PlaceRoute {
  distanceM: number;
  durationSeconds: number;
  geometry: readonly { latitude: number; longitude: number }[];
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
