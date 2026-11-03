import { describe, it, expect, vi } from 'vitest';
import {
  createNotificationRepository,
  decodeNotification,
  decodePreferences,
} from '../src/infrastructure/repositories/notification.gateway-repository';
import { cursorPage } from '../src/infrastructure/http/cursor-page';
import {
  createRuntimePriceWatchRepository,
  decodeWatch,
  decodeObservation,
} from '../src/infrastructure/repositories/runtime-price-watch.gateway-repository';
import { createGatewayHttpClient } from '../src/infrastructure/http/http-client';
import { parseEnvelope } from '../src/infrastructure/http/envelope';
const id = '11111111-1111-4111-8111-111111111111';
const watch = {
  id,
  trip_id: id,
  user_id: id,
  status: 'ACTIVE',
  status_reason: null,
  version: 1,
  expires_at: '2030-01-01T00:00:00Z',
  threshold_price: '9223372036854775807',
  normalized_query: {
    provider: 'MOCK_FLIGHT',
    transport_type: 'FLIGHT',
    origin: 'DAD',
    destination: 'SGN',
    departure_date: '2030-01-02',
    departure_at: '2030-01-02T02:00:00Z',
    return_date: null,
    journey_type: 'ONE_WAY',
    passengers: { adults: 1, children: 0, infants: 0 },
    cabin_class: 'FIRST',
    currency: 'VND',
  },
};
describe('runtime UI contract adapters', () => {
  it('preserves meta cursor separately from data and rejects malformed cursor', () => {
    expect(parseEnvelope({ data: [], meta: { next_cursor: 'opaque+/cursor=' } })).toMatchObject({
      metadata: { nextCursor: 'opaque+/cursor=' },
    });
    expect(() => parseEnvelope({ data: [], meta: { next_cursor: 12 } })).toThrow();
    expect(() => cursorPage({ data: [], correlationId: null }, decodeNotification)).toThrow();
  });
  it('keeps lifecycle, passenger mix, FIRST cabin and int64 strings', () => {
    expect(decodeWatch(watch, id)).toMatchObject({
      status: 'ACTIVE',
      fields: {
        threshold_price: '9223372036854775807',
        cabin_class: 'FIRST',
        passengers: { adults: 1, children: 0, infants: 0 },
      },
    });
    for (const status of ['ACTIVE', 'PAUSED', 'EXPIRED', 'STOPPED'])
      expect(decodeWatch({ ...watch, status }, id).status).toBe(status);
    expect(() => decodeWatch({ ...watch, status: 'PROVIDER_ERROR' }, id)).toThrow();
    expect(() => decodeWatch({ ...watch, threshold_price: '9223372036854775808' }, id)).toThrow();
    expect(() =>
      decodeWatch({ ...watch, trip_id: '22222222-2222-4222-8222-222222222222' }, id),
    ).toThrow();
  });
  it('never replaces missing prices with zero or last alert price', () => {
    expect(() => decodeObservation({ id, price: null, currency: 'VND' })).toThrow();
    expect(decodeWatch({ ...watch, last_alert_price: '100' }, id)).not.toHaveProperty(
      'latestPrice',
    );
  });
  it('rejects a departure date that differs from the UTC instant', () => {
    expect(() =>
      decodeWatch(
        {
          ...watch,
          normalized_query: {
            ...watch.normalized_query,
            departure_at: '2030-01-02T01:00:00+07:00',
          },
        },
        id,
      ),
    ).toThrow('UTC');
  });
  it('preserves masked notifications and does not invent deep links', () => {
    expect(
      decodeNotification({
        id,
        type: 'PLAN',
        title: 'Không còn quyền',
        body: '',
        trip_id: null,
        source_id: null,
        status: 'AVAILABLE',
        created_at: '2026-10-01T00:00:00Z',
        read_at: null,
      }),
    ).toMatchObject({ tripId: null, sourceId: null, readAt: null });
  });
  it('preserves complete preference overrides and master switches', () => {
    const preferences = {
      push_enabled: false,
      email_enabled: true,
      group_overrides: { PRICE: { push: true }, PLAN: { email: false } },
      version: 3,
    };
    expect(decodePreferences(preferences)).toEqual(preferences);
    expect(() => decodePreferences({ ...preferences, version: 0 })).toThrow();
  });
  it('uses encoded opaque cursors and only documented write routes', async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [], meta: { next_cursor: null } }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: watch, meta: {} }), { status: 200 }),
      );
    const client = createGatewayHttpClient({ transport }),
      repo = createRuntimePriceWatchRepository(client);
    await repo.list(id, 'opaque+/cursor=');
    expect(String(transport.mock.calls[0]![0])).toContain('cursor=opaque%2B%2Fcursor%3D');
    await repo.command(id, {
      method: 'POST',
      path: `/api/v1/price-watches/${id}/stop`,
      body: { expected_version: 1 },
    });
    expect(transport.mock.calls[1]![1]?.method).toBe('POST');
    expect(transport.mock.calls[1]![1]?.body).toBe('{"expected_version":1}');
  });
  it('preferences PUT carries version and never registers browser devices', async () => {
    const value = {
      push_enabled: false,
      email_enabled: true,
      group_overrides: { PRICE: { email: false } },
      version: 2,
    };
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { ...value, version: 3 }, meta: {} }), { status: 200 }),
      );
    await createNotificationRepository(createGatewayHttpClient({ transport })).save(value);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0]![0]).toBe('/api/v1/me/notification-preferences');
    expect(JSON.parse(String(transport.mock.calls[0]![1]?.body))).toEqual({
      push_enabled: false,
      email_enabled: true,
      group_overrides: { PRICE: { email: false } },
      expected_version: 2,
    });
  });
});
