import type { GatewayHttpClient } from '../http/http-client';
import * as d from '../http/decode';
import { ApiError } from '../http/api-error';
import { cursorPage } from '../http/cursor-page';
import {
  flightProviders,
  cabinClasses,
  journeyTypes,
  type PriceWatchCapabilities,
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
      provider: d.enumeration(q.provider, flightProviders),
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
/** Strict `Capabilities`: known enums only, unique lists, counts 0–9, a usable source when available. */
export function decodeCapabilities(value: unknown): PriceWatchCapabilities {
  const r = d.object(value);
  const list = <const T extends readonly string[]>(raw: unknown, choices: T): T[number][] => {
    const items = d.list(raw, (item) => d.enumeration(item, choices));
    if (new Set(items).size !== items.length) throw Error('Duplicate capability');
    return items;
  };
  const count = (raw: unknown) => {
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0 || raw > 9)
      throw Error('Invalid capability count');
    return raw;
  };
  const result: PriceWatchCapabilities = {
    provider: d.enumeration(r.provider, flightProviders),
    available: d.boolean(r.available),
    journeyTypes: list(r.journey_types, journeyTypes),
    cabinClasses: list(r.cabin_classes, cabinClasses),
    maxAdults: count(r.max_adults),
    maxChildren: count(r.max_children),
    maxInfants: count(r.max_infants),
    maxPassengers: count(r.max_passengers),
    currencies: list(r.currencies, ['VND'] as const),
  };
  if (
    result.available &&
    (!result.journeyTypes.length ||
      !result.cabinClasses.length ||
      result.maxAdults < 1 ||
      result.maxPassengers < 1 ||
      !result.currencies.includes('VND'))
  )
    throw Error('Unusable capabilities');
  return result;
}
export function decodeObservation(value: unknown): RuntimeObservation {
  const r = d.object(value);
  const metadata =
    r.fare_metadata && typeof r.fare_metadata === 'object' ? d.object(r.fare_metadata) : {};
  d.enumeration(r.currency, ['VND']);
  return {
    id: d.uuid(r.id),
    price: d.money(r.price, true),
    provider: d.string(r.provider),
    observedAt: d.instant(r.observed_at),
    fetchedAt: d.instant(r.fetched_at),
    providerFoundAt:
      typeof metadata.provider_found_at === 'string' ? d.instant(metadata.provider_found_at) : null,
    providerExpiresAt:
      typeof metadata.provider_expires_at === 'string'
        ? d.instant(metadata.provider_expires_at)
        : null,
    dataKind: typeof metadata.data_kind === 'string' ? metadata.data_kind : null,
  };
}
export function createRuntimePriceWatchRepository(client: GatewayHttpClient) {
  const pageQuery = (cursor: string | null) => {
    const q = new URLSearchParams({ limit: '20' });
    if (cursor) q.set('cursor', cursor);
    return q;
  };
  return {
    /**
     * What the configured fare source supports, or null when the Gateway predates
     * `GET /price-watch-capabilities` (404): the form then keeps its earlier behaviour.
     */
    async capabilities(signal?: AbortSignal): Promise<PriceWatchCapabilities | null> {
      try {
        const response = await client.read(
          '/api/v1/price-watch-capabilities',
          signal ? { signal } : {},
        );
        return decodeCapabilities(response.data);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
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
      const response = await client.read(
        `/api/v1/price-watches/${encodeURIComponent(id)}/observations?${pageQuery(cursor)}`,
        signal ? { signal } : {},
      );
      return { ...cursorPage(response, decodeObservation), source: response.metadata?.priceSource };
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
