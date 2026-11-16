export interface DiscoveredPlace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  token: string;
  attribution: string;
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
