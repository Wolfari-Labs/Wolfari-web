import type { GatewayHttpClient } from '../http/http-client';
import * as d from '../http/decode';
import { cursorPage } from '../http/cursor-page';
import {
  runtimeStatuses,
  validateWatchFields,
  type RuntimeWatch,
  type RuntimeObservation,
  type WatchIntent,
} from '../../features/price-watch/model/runtime-price-watch';
export function decodeWatch(value: unknown, tripId: string): RuntimeWatch {
  const r = d.object(value),
    q = d.object(r.normalized_query),
    p = d.object(q.passengers);
  d.scope(d.uuid(r.trip_id), tripId);
  d.enumeration(q.transport_type, ['FLIGHT']);
  const passenger = (value: unknown, min: number) => {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > 9)
      throw Error('Invalid passenger mix');
    return value;
  };
  const result: RuntimeWatch = {
    id: d.uuid(r.id),
    tripId,
    ownerId: d.uuid(r.user_id),
    status: d.enumeration(r.status, runtimeStatuses),
    statusReason: d.nullable(r.status_reason, d.string),
    version: d.version(r.version),
    expiresAt: d.instant(r.expires_at),
    fields: {
      provider: d.enumeration(q.provider, ['MOCK_FLIGHT']),
      origin: d.string(q.origin),
      destination: d.string(q.destination),
      departure_date: d.string(q.departure_date),
      departure_at: d.instant(q.departure_at),
      return_date: d.nullable(q.return_date, d.string),
      journey_type: d.enumeration(q.journey_type, ['ONE_WAY', 'ROUND_TRIP']),
      passengers: {
        adults: passenger(p.adults, 1),
        children: passenger(p.children, 0),
        infants: passenger(p.infants, 0),
      },
      cabin_class: d.nullable(q.cabin_class, (v) =>
        d.enumeration(v, ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']),
      ),
      currency: d.enumeration(q.currency, ['VND']),
      threshold_price: d.money(r.threshold_price, true),
    },
  };
  validateWatchFields(result.fields);
  return result;
}
export function decodeObservation(value: unknown): RuntimeObservation {
  const r = d.object(value);
  d.enumeration(r.currency, ['VND']);
  return {
    id: d.uuid(r.id),
    price: d.money(r.price, true),
    provider: d.string(r.provider),
    observedAt: d.instant(r.observed_at),
    fetchedAt: d.instant(r.fetched_at),
  };
}
export function createRuntimePriceWatchRepository(client: GatewayHttpClient) {
  const pageQuery = (cursor: string | null) => {
    const q = new URLSearchParams({ limit: '20' });
    if (cursor) q.set('cursor', cursor);
    return q;
  };
  return {
    async list(tripId: string, cursor: string | null, signal?: AbortSignal) {
      return cursorPage(
        await client.read(
          `/api/v1/trips/${encodeURIComponent(tripId)}/price-watches?${pageQuery(cursor)}`,
          signal ? { signal } : {},
        ),
        (value) => decodeWatch(value, tripId),
      );
    },
    async observations(id: string, cursor: string | null, signal?: AbortSignal) {
      return cursorPage(
        await client.read(
          `/api/v1/price-watches/${encodeURIComponent(id)}/observations?${pageQuery(cursor)}`,
          signal ? { signal } : {},
        ),
        decodeObservation,
      );
    },
    async command(tripId: string, intent: WatchIntent, signal?: AbortSignal) {
      return decodeWatch(
        (
          await client.write(intent.path, {
            ...(signal ? { signal } : {}),
            method: intent.method,
            body: intent.body,
            ...(intent.key ? { idempotencyKey: intent.key } : {}),
          })
        ).data,
        tripId,
      );
    },
  };
}
