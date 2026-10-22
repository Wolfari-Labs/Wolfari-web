import { describe, expect, it, vi } from 'vitest';
import type {
  ReadResult,
  TripListItem,
  TripListViewModel,
} from '../src/features/trips/model/trip-list';
import type {
  CreateTripIntent,
  TripRepository,
  UpdateTripIntent,
} from '../src/features/trips/repositories/trip.repository';
import { createGatewayTripRepository } from '../src/infrastructure/repositories/trip.gateway-repository';
import { selectTripRepository } from '../src/infrastructure/repositories/select-trip-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { createFixtureShellRepository } from '../src/infrastructure/fixtures/shell.fixture-repository';
import { createGatewayHttpClient } from '../src/infrastructure/http/http-client';
import type { GatewayHttpClient } from '../src/infrastructure/http/http-client';
import { ApiError } from '../src/infrastructure/http/api-error';
import {
  fixtureTripCatalog,
  fixtureViewerId,
  fixtureLifecycleAsOf,
  previewTripId,
} from '../src/infrastructure/fixtures/trip-catalog';

function request(signal = new AbortController().signal) {
  return { scenario: 'success' as const, signal };
}

function gatewayTrip(overrides: Record<string, unknown> = {}) {
  const source = fixtureTripCatalog[0]!;
  return {
    id: source.id,
    name: source.name,
    description: 'Mô tả nội bộ',
    public_description: 'Mô tả công khai',
    start_at: source.startAt,
    end_at: source.endAt,
    timezone: source.timezone,
    lifecycle: source.lifecycle,
    archived_at: null,
    plan_edit_policy: 'OWNER_ONLY',
    plan_version: source.planVersion,
    membership_revision: source.membershipRevision,
    export_revision: source.exportRevision,
    current_membership: {
      id: source.currentMembership.id,
      trip_id: source.id,
      user_id: source.currentMembership.userId,
      role: source.currentMembership.role,
      joined_at: source.currentMembership.joinedAt,
      left_at: null,
    },
    permissions: { can_read: true, can_update: true },
    ...overrides,
  };
}

describe('Trip repository boundary', () => {
  it('PATCHes only supported dirty metadata with exact revisions and idempotency key', async () => {
    const source = fixtureTripCatalog[0]!;
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: source.id,
            name: 'Tên mới',
            description: null,
            public_description: null,
            start_at: source.startAt,
            end_at: source.endAt,
            timezone: source.timezone,
            lifecycle: source.lifecycle,
            archived_at: null,
            plan_edit_policy: 'OWNER_ONLY',
            plan_version: 1,
            membership_revision: 1,
            export_revision: 2,
            current_membership: {
              id: source.currentMembership.id,
              trip_id: source.id,
              user_id: source.currentMembership.userId,
              role: 'OWNER',
              joined_at: source.currentMembership.joinedAt,
              left_at: null,
            },
            permissions: { can_read: true, can_update: true },
          },
          meta: { correlation_id: 'trip-update-correlation' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const repository = createGatewayTripRepository(
      undefined,
      undefined,
      createGatewayHttpClient({ transport }),
    );
    const intent = {
      name: 'Tên mới',
      description: null,
      publicDescription: 'Mô tả công khai mới',
      expectedPlanVersion: 1,
      expectedExportRevision: 1,
      idempotencyKey: '22222222-2222-4222-8222-222222222222',
      destination: 'must-not-leak',
      budget: 123,
      startAt: 'must-not-leak',
    } as UpdateTripIntent & Record<string, unknown>;
    const result = await repository.updateTrip({
      tripId: source.id,
      intent,
      signal: new AbortController().signal,
    });
    expect(result).toMatchObject({
      status: 'updated',
      trip: { name: 'Tên mới', description: null, exportRevision: 2 },
    });
    const [url, init] = transport.mock.calls[0]!;
    expect(url).toBe(`/api/v1/trips/${source.id}`);
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBe(
      '22222222-2222-4222-8222-222222222222',
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      name: 'Tên mới',
      description: null,
      public_description: 'Mô tả công khai mới',
      expected_plan_version: 1,
      expected_export_revision: 1,
    });
  });

  it.each([
    [400, 'INVALID_ARGUMENT', 'validation-error'],
    [403, 'PERMISSION_DENIED', 'forbidden'],
    [404, 'RESOURCE_NOT_FOUND', 'not-found'],
    [409, 'VERSION_CONFLICT', 'conflict'],
    [409, 'STATE_CONFLICT', 'conflict'],
    [409, 'IDEMPOTENCY_CONFLICT', 'conflict'],
    [503, 'SERVICE_UNAVAILABLE', 'unavailable'],
  ] as const)('maps update HTTP %s to %s without retrying', async (status, code, expected) => {
    const write = vi.fn<GatewayHttpClient['write']>().mockRejectedValue(
      new ApiError(
        'Update failed',
        'http',
        status,
        code,
        'update-correlation',
        status === 503,
        status === 400
          ? {
              field_errors: {
                name: 'Tên chưa hợp lệ',
                public_description: 'Mô tả công khai chưa hợp lệ',
              },
            }
          : null,
      ),
    );
    const client: GatewayHttpClient = {
      read: vi.fn<GatewayHttpClient['read']>(),
      write,
    };
    const result = await createGatewayTripRepository(undefined, undefined, client).updateTrip({
      tripId: previewTripId,
      intent: {
        name: 'Tên mới',
        expectedPlanVersion: 1,
        expectedExportRevision: 1,
        idempotencyKey: '55555555-5555-4555-8555-555555555555',
      },
      signal: new AbortController().signal,
    });
    expect(result).toMatchObject({ status: expected, correlationId: 'update-correlation' });
    if (expected === 'validation-error') {
      expect(result).toMatchObject({
        fieldErrors: {
          name: 'Tên chưa hợp lệ',
          publicDescription: 'Mô tả công khai chưa hợp lệ',
        },
      });
    }
    expect(write).toHaveBeenCalledTimes(1);
  });

  it.each(['network', 'timeout', 'invalid-response'] as const)(
    'keeps an indeterminate %s update as unknown without retrying',
    async (kind) => {
      const write = vi
        .fn<GatewayHttpClient['write']>()
        .mockRejectedValue(new ApiError('Unknown outcome', kind, null, null, null, true));
      const client: GatewayHttpClient = {
        read: vi.fn<GatewayHttpClient['read']>(),
        write,
      };
      expect(
        await createGatewayTripRepository(undefined, undefined, client).updateTrip({
          tripId: previewTripId,
          intent: {
            description: 'Bản nháp',
            expectedPlanVersion: 1,
            expectedExportRevision: 1,
            idempotencyKey: '66666666-6666-4666-8666-666666666666',
          },
          signal: new AbortController().signal,
        }),
      ).toMatchObject({ status: 'unknown', retryable: true });
      expect(write).toHaveBeenCalledTimes(1);
    },
  );

  it('uses the default page size, preserves an opaque cursor and maps next_cursor', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { items: [gatewayTrip()], next_cursor: 'next/+opaque==' },
          meta: { correlation_id: 'trip-list-correlation' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const repository = createGatewayTripRepository(
      undefined,
      undefined,
      createGatewayHttpClient({ transport }),
    );
    const result = await repository.listTrips({
      ...request(),
      cursor: 'current/+opaque==',
    });
    expect(result).toMatchObject({
      status: 'ready',
      data: {
        nextCursor: 'next/+opaque==',
        items: [
          {
            id: previewTripId,
            description: 'Mô tả nội bộ',
            publicDescription: 'Mô tả công khai',
          },
        ],
      },
    });
    const url = new URL(String(transport.mock.calls[0]![0]), 'https://wolfari.invalid');
    expect(url.pathname).toBe('/api/v1/trips');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('cursor')).toBe('current/+opaque==');
  });

  it('maps a Gateway trip detail projection without inventing presentation data', async () => {
    const read = vi.fn<GatewayHttpClient['read']>().mockResolvedValue({
      data: gatewayTrip(),
      correlationId: 'trip-detail-correlation',
    });
    const repository = createGatewayTripRepository(undefined, undefined, {
      read,
      write: vi.fn<GatewayHttpClient['write']>(),
    });
    const result = await repository.getTrip({
      tripId: previewTripId,
      scenario: 'success',
      signal: new AbortController().signal,
    });
    expect(result).toMatchObject({
      status: 'ready',
      data: {
        id: previewTripId,
        description: 'Mô tả nội bộ',
        publicDescription: 'Mô tả công khai',
        presentation: { memberCount: null, cover: null },
      },
    });
    expect(read).toHaveBeenCalledExactlyOnceWith(`/api/v1/trips/${previewTripId}`, {
      signal: expect.any(AbortSignal),
      includeCredentials: true,
    });
  });

  it.each([
    [403, 'PERMISSION_DENIED', 'PERMISSION_DENIED'],
    [404, 'RESOURCE_NOT_FOUND', 'RESOURCE_NOT_FOUND'],
    [409, 'VERSION_CONFLICT', 'VERSION_CONFLICT'],
    [503, 'SERVICE_UNAVAILABLE', 'SERVICE_UNAVAILABLE'],
  ] as const)('maps detail HTTP %s/%s to a domain read error', async (status, code, expected) => {
    const read = vi
      .fn<GatewayHttpClient['read']>()
      .mockRejectedValue(
        new ApiError('Read failed', 'http', status, code, 'detail-id', status === 503),
      );
    const result = await createGatewayTripRepository(undefined, undefined, {
      read,
      write: vi.fn<GatewayHttpClient['write']>(),
    }).getTrip({
      tripId: previewTripId,
      scenario: 'success',
      signal: new AbortController().signal,
    });
    expect(result).toMatchObject({
      status: 'error',
      error: { code: expected, correlationId: 'detail-id' },
    });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('POSTs only the create allowlist and uses client_request_id as the idempotency key', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: gatewayTrip({ name: 'Hành trình mới' }),
          meta: { correlation_id: 'trip-create-correlation' },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const repository = createGatewayTripRepository(
      undefined,
      undefined,
      createGatewayHttpClient({ transport }),
    );
    const intent = {
      name: 'Hành trình mới',
      description: 'Mô tả',
      startAt: '2026-11-01T00:00:00+07:00',
      endAt: '2026-11-03T00:00:00+07:00',
      timezone: 'Asia/Ho_Chi_Minh',
      clientRequestId: '33333333-3333-4333-8333-333333333333',
      destination: 'must-not-leak',
      budget: 'must-not-leak',
      cover: 'must-not-leak',
      template: 'must-not-leak',
      style: 'must-not-leak',
      expectedMembers: 10,
    } as CreateTripIntent & Record<string, unknown>;
    expect(
      await repository.createTrip({ intent, signal: new AbortController().signal }),
    ).toMatchObject({
      status: 'created',
      tripId: previewTripId,
      correlationId: 'trip-create-correlation',
    });
    const [, init] = transport.mock.calls[0]!;
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBe(intent.clientRequestId);
    expect(JSON.parse(String(init?.body))).toEqual({
      name: intent.name,
      description: intent.description,
      start_at: intent.startAt,
      end_at: intent.endAt,
      timezone: intent.timezone,
      client_request_id: intent.clientRequestId,
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it.each([
    [new ApiError('Timed out', 'timeout', null, null, null, true), 'unknown'],
    [
      new ApiError('Unavailable', 'http', 503, 'SERVICE_UNAVAILABLE', 'create-id', true),
      'unavailable',
    ],
    [new ApiError('Conflict', 'http', 409, 'IDEMPOTENCY_CONFLICT', 'create-id', false), 'conflict'],
  ] as const)('does not retry a failed create mutation', async (failure, expected) => {
    const write = vi.fn<GatewayHttpClient['write']>().mockRejectedValue(failure);
    const repository = createGatewayTripRepository(undefined, undefined, {
      read: vi.fn<GatewayHttpClient['read']>(),
      write,
    });
    const result = await repository.createTrip({
      intent: {
        name: 'Trip',
        startAt: '2026-11-01T00:00:00+07:00',
        endAt: '2026-11-03T00:00:00+07:00',
        timezone: 'Asia/Ho_Chi_Minh',
        clientRequestId: '99999999-9999-4999-8999-999999999999',
      },
      signal: new AbortController().signal,
    });
    expect(result).toMatchObject({ status: expected });
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('propagates cancellation and never retries an aborted mutation', async () => {
    const controller = new AbortController();
    const abortError = new DOMException('Cancelled', 'AbortError');
    const write = vi.fn<GatewayHttpClient['write']>((_path, { signal }) => {
      return new Promise((_, reject) => {
        signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
    });
    const pending = createGatewayTripRepository(undefined, undefined, {
      read: vi.fn<GatewayHttpClient['read']>(),
      write,
    }).updateTrip({
      tripId: previewTripId,
      intent: {
        name: 'Draft',
        expectedPlanVersion: 1,
        expectedExportRevision: 1,
        idempotencyKey: '77777777-7777-4777-8777-777777777777',
      },
      signal: controller.signal,
    });
    controller.abort(abortError);
    await expect(pending).rejects.toBe(abortError);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('reports unavailable without an HTTP request or a fabricated mutation', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const repository = createGatewayTripRepository();
      expect(await repository.listTrips(request())).toEqual({
        status: 'error',
        error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: false },
      });
      expect(
        await repository.createTrip({
          intent: {
            name: 'Trip',
            startAt: '2026-10-20T00:00:00+07:00',
            endAt: '2026-10-21T00:00:00+07:00',
            timezone: 'Asia/Ho_Chi_Minh',
            clientRequestId: 'request-1',
          },
          signal: new AbortController().signal,
        }),
      ).toMatchObject({ status: 'unavailable' });
      expect(Object.keys(repository).sort()).toEqual([
        'createTrip',
        'getTrip',
        'listTrips',
        'updateTrip',
      ]);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('honors an already aborted read in the unconfigured adapter', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      createGatewayTripRepository().listTrips(request(controller.signal)),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('forwards the unchanged request and domain result to a supplied projection reader', async () => {
    const result: ReadResult<TripListViewModel> = {
      status: 'error',
      error: { code: 'PERMISSION_DENIED', correlationId: 'trip-read', retryable: false },
    };
    const reader = vi.fn(async () => result);
    const repository: TripRepository = createGatewayTripRepository(reader);
    const input = request();
    expect(await repository.listTrips(input)).toBe(result);
    expect(reader).toHaveBeenCalledExactlyOnceWith(input);
  });

  it('forwards cancellation while a supplied projection read is pending', async () => {
    const controller = new AbortController();
    const repository = createGatewayTripRepository(
      ({ signal }) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        }),
    );
    const pending = repository.listTrips(request(controller.signal));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('blocks fixture selection in production before evaluating the factory', async () => {
    const factory = vi.fn(() => createGatewayTripRepository());
    await expect(selectTripRepository('fixture', false, factory)).rejects.toThrow(
      'Fixture requires development or explicit UI preview',
    );
    expect(factory).not.toHaveBeenCalled();
  });

  it('requires an explicit fixture factory and rejects unknown modes', async () => {
    await expect(selectTripRepository('fixture', true)).rejects.toThrow(
      'Fixture factory is missing',
    );
    await expect(selectTripRepository('invented', true)).rejects.toThrow('Invalid data mode');
  });

  it('uses the supplied read-only adapter only when fixture preview is allowed', async () => {
    const adapter: TripRepository = {
      listTrips: async () => ({ status: 'empty' }),
      getTrip: async () => ({ status: 'empty' }),
      createTrip: async () => ({
        status: 'unavailable',
        correlationId: null,
        retryable: false,
      }),
      updateTrip: async () => ({
        status: 'unavailable',
        correlationId: null,
        retryable: false,
      }),
    };
    const factory = vi.fn(() => adapter);
    expect(await selectTripRepository(undefined, true, factory)).toBe(adapter);
    expect(await selectTripRepository('fixture', true, factory)).toBe(adapter);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('defaults production to the unavailable Gateway and ignores an unused fixture factory', async () => {
    const factory = vi.fn(() => createGatewayTripRepository());
    for (const mode of [undefined, 'gateway']) {
      const repository = await selectTripRepository(mode, false, factory);
      expect(await repository.listTrips(request())).toMatchObject({
        status: 'error',
        error: { code: 'SERVICE_UNAVAILABLE' },
      });
    }
    expect(factory).not.toHaveBeenCalled();
  });
});

describe('Trip List fixture projection', () => {
  async function items(repository = createFixtureTripRepository()) {
    const result = await repository.listTrips(request());
    if (result.status !== 'ready') throw new Error('Expected readable trip fixture');
    return result.data.items;
  }

  function firstRecord(): TripListItem {
    const item = fixtureTripCatalog[0];
    if (!item) throw new Error('Expected canonical trip fixture');
    return item;
  }

  it('returns the six canonical source cards, fixed lifecycle labels and preserved read revisions', async () => {
    const repository = createFixtureTripRepository();
    const first = await repository.listTrips(request());
    expect(await repository.listTrips(request())).toEqual(first);
    const records = await items(repository);
    expect(records.map((item) => item.name)).toEqual([
      'Đà Nẵng – Hội An',
      'Phú Quốc – Hẹn với biển',
      'Đà Lạt – Một chút bình yên',
      'Sài Gòn – Vũng Tàu',
      'Huế – Chậm một nhịp',
      'Ninh Bình – Giữa núi xanh',
    ]);
    expect(fixtureLifecycleAsOf).toBe('2026-09-23');
    expect(records.map((item) => item.lifecycle)).toEqual([
      'ONGOING',
      'UPCOMING',
      'UPCOMING',
      'UPCOMING',
      'COMPLETED',
      'COMPLETED',
    ]);
    expect(first).toMatchObject({ status: 'ready', data: { nextCursor: null } });
    expect(records.map((item) => item.presentation.memberCount)).toEqual([4, 6, 3, 5, 2, 4]);
    for (const item of records) {
      expect(item.timezone).toBe('Asia/Ho_Chi_Minh');
      expect(Date.parse(item.startAt)).toBeLessThan(Date.parse(item.endAt));
      expect(item).toMatchObject({
        planVersion: 1,
        membershipRevision: 1,
        exportRevision: 1,
        currentMembership: { tripId: item.id, userId: fixtureViewerId, leftAt: null },
        permissions: {
          canRead: true,
          canUpdate: item.currentMembership.role === 'OWNER' && item.lifecycle !== 'ARCHIVED',
        },
      });
    }
    expect(Object.keys(repository).sort()).toEqual([
      'createTrip',
      'getTrip',
      'listTrips',
      'updateTrip',
    ]);
  });

  it('uses responsive source illustrations only for the two mapped cards', async () => {
    const records = await items();
    expect(records[0]?.presentation.cover?.mobileSrc).toContain('8bc2c.svg');
    expect(records[2]?.presentation.cover?.mobileSrc).toContain('9478a.svg');
    for (const index of [1, 3, 4, 5])
      expect(records[index]?.presentation.cover?.mobileSrc).toBeNull();
    for (const item of records) expect(item.presentation.cover?.alt).toBe('');
  });

  it('filters denied, different-viewer, inactive and mismatched memberships before exposing items', async () => {
    const canonical = firstRecord();
    const records: readonly TripListItem[] = [
      canonical,
      { ...canonical, permissions: { canRead: false, canUpdate: false } },
      {
        ...canonical,
        currentMembership: { ...canonical.currentMembership, userId: 'another-viewer' },
      },
      {
        ...canonical,
        currentMembership: {
          ...canonical.currentMembership,
          leftAt: '2026-09-01T00:00:00+07:00',
        },
      },
      {
        ...canonical,
        currentMembership: { ...canonical.currentMembership, tripId: 'another-trip' },
      },
    ];
    expect(await items(createFixtureTripRepository({ records }))).toEqual([canonical]);
    const result = await items();
    expect(result.some((item) => item.id.startsWith('88888888'))).toBe(false);
    expect(JSON.stringify(result)).not.toContain('không được hiển thị');
    expect(
      await createFixtureTripRepository({ viewerId: 'another-viewer' }).listTrips(request()),
    ).toEqual({ status: 'empty' });
  });

  it('returns independent deep clones and snapshots configured records without mutating the catalog', async () => {
    const source = structuredClone(firstRecord());
    const repository = createFixtureTripRepository({ records: [source] });
    Object.assign(source, { name: 'Changed outside repository' });
    const first = await items(repository);
    const firstItem = first[0];
    if (!firstItem) throw new Error('Expected fixture');
    Object.assign(firstItem, { name: 'Changed by consumer' });
    Object.assign(firstItem.permissions, { canRead: false });
    Object.assign(firstItem.currentMembership, { leftAt: '2026-09-01T00:00:00Z' });
    const second = await items(repository);
    expect(second[0]).toEqual(firstRecord());
    expect(second[0]).not.toBe(firstItem);
    expect(Object.isFrozen(fixtureTripCatalog)).toBe(true);
    expect(Object.isFrozen(firstRecord())).toBe(true);
    expect(Object.isFrozen(firstRecord().currentMembership)).toBe(true);
    expect(Object.isFrozen(firstRecord().permissions)).toBe(true);
    expect(Object.isFrozen(firstRecord().presentation.cover)).toBe(true);
  });

  it('preserves unknown enrichment instead of fabricating a cover or member count', async () => {
    const record = { ...firstRecord(), presentation: { memberCount: null, cover: null } };
    const result = await items(createFixtureTripRepository({ records: [record] }));
    expect(result[0]?.presentation).toEqual({ memberCount: null, cover: null });
  });

  it.each([
    ['error', 'SERVICE_UNAVAILABLE', true],
    ['forbidden', 'PERMISSION_DENIED', false],
    ['conflict', 'VERSION_CONFLICT', false],
    ['unavailable', 'SERVICE_UNAVAILABLE', false],
  ] as const)(
    'keeps %s evidence without exposing trip payloads',
    async (scenario, code, retryable) => {
      expect(await createFixtureTripRepository().listTrips({ ...request(), scenario })).toEqual({
        status: 'error',
        error: { code, correlationId: 'fixture-trip-list', retryable },
      });
    },
  );

  it('supports explicit empty data and cancellation before or during fixture loading', async () => {
    const repository = createFixtureTripRepository();
    expect(await repository.listTrips({ ...request(), scenario: 'empty' })).toEqual({
      status: 'empty',
    });
    expect(await createFixtureTripRepository({ records: [] }).listTrips(request())).toEqual({
      status: 'empty',
    });
    const controller = new AbortController();
    const pending = repository.listTrips({
      scenario: 'loading',
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await expect(repository.listTrips(request(controller.signal))).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('updates Owner metadata, clears description and replays the same idempotent result', async () => {
    const repository = createFixtureTripRepository();
    const input = {
      tripId: previewTripId,
      intent: {
        name: 'Hành trình mới',
        description: null,
        expectedPlanVersion: 1,
        expectedExportRevision: 1,
        idempotencyKey: '33333333-3333-4333-8333-333333333333',
      },
      signal: new AbortController().signal,
    };
    const first = await repository.updateTrip(input);
    const replay = await repository.updateTrip(input);
    expect(first).toEqual(replay);
    expect(first).toMatchObject({
      status: 'updated',
      trip: { name: 'Hành trình mới', description: null, exportRevision: 2 },
    });
    expect(await repository.getTrip({ ...request(), tripId: previewTripId })).toMatchObject({
      status: 'ready',
      data: { name: 'Hành trình mới', description: null, exportRevision: 2 },
    });
    expect(
      await repository.updateTrip({ ...input, intent: { ...input.intent, name: 'Khác' } }),
    ).toMatchObject({
      status: 'conflict',
    });
  });

  it('keeps Member and archived Owner updates read-only', async () => {
    const member = fixtureTripCatalog.find((item) => item.currentMembership.role === 'MEMBER')!;
    const archived = {
      ...fixtureTripCatalog[0]!,
      lifecycle: 'ARCHIVED' as const,
      permissions: { canRead: true, canUpdate: false },
    };
    for (const [repository, tripId] of [
      [createFixtureTripRepository(), member.id],
      [createFixtureTripRepository({ records: [archived] }), archived.id],
    ] as const) {
      expect(
        await repository.updateTrip({
          tripId,
          intent: {
            name: 'Không được lưu',
            expectedPlanVersion: 1,
            expectedExportRevision: 1,
            idempotencyKey: '44444444-4444-4444-8444-444444444444',
          },
          signal: new AbortController().signal,
        }),
      ).toMatchObject({ status: 'forbidden' });
    }
  });

  it('opens all six readable fixture destinations without granting an Admin or Guest trip rights', async () => {
    const shell = createFixtureShellRepository();
    for (const item of await items()) {
      const input = { tripId: item.id, scenario: 'success' as const, signal: request().signal };
      expect(await shell.read(input)).toMatchObject({
        status: 'ready',
        data: {
          trip: {
            id: item.id,
            planVersion: item.planVersion,
            membershipRevision: item.membershipRevision,
            exportRevision: item.exportRevision,
            permissions: {
              canRead: true,
              canUpdate: item.currentMembership.role === 'OWNER' && item.lifecycle !== 'ARCHIVED',
            },
          },
        },
      });
      expect(await shell.read({ ...input, scenario: 'admin' })).toMatchObject({
        status: 'ready',
        data: { trip: { permissions: { canRead: false, canUpdate: false } } },
      });
      expect(await shell.read({ ...input, scenario: 'guest' })).toMatchObject({
        status: 'ready',
        data: { viewer: null, trip: null },
      });
    }
    for (const tripId of [
      '22222222-2222-4222-8222-222222222222',
      '88888888-8888-4888-8888-888888888888',
    ])
      expect(
        await shell.read({ tripId, scenario: 'success', signal: request().signal }),
      ).toMatchObject({ status: 'error', error: { code: 'RESOURCE_NOT_FOUND' } });
    expect(previewTripId).toBe(firstRecord().id);
  });
});
