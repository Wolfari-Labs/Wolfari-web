import type { GatewayHttpClient } from '../http/http-client';
import * as d from '../http/decode';
import type { DiscoveredPlace, PlaceIntent } from '../../features/map/places';
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
  return {
    id: d.string(p.id),
    name: d.string(p.name),
    address: typeof p.address === 'string' ? p.address : '',
    latitude: c.latitude,
    longitude: c.longitude,
    token: d.string(p.selection_token),
    attribution: d.string(p.attribution),
  };
}
export function createPlacesRepository(client: GatewayHttpClient) {
  return {
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
