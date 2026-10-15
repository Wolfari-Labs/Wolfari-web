import { describe, expect, it, vi } from 'vitest';
import type {
  ReadResult,
  TripListItem,
  TripListViewModel,
} from '../src/features/trips/model/trip-list';
import type { TripRepository } from '../src/features/trips/repositories/trip.repository';
import { createGatewayTripRepository } from '../src/infrastructure/repositories/trip.gateway-repository';
import { selectTripRepository } from '../src/infrastructure/repositories/select-trip-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { createFixtureShellRepository } from '../src/infrastructure/fixtures/shell.fixture-repository';
import {
  fixtureTripCatalog,
  fixtureViewerId,
  fixtureLifecycleAsOf,
  previewTripId,
} from '../src/infrastructure/fixtures/trip-catalog';

function request(signal = new AbortController().signal) {
  return { scenario: 'success' as const, signal };
}

describe('Trip repository boundary', () => {
  it('reports unavailable without an HTTP request or a fabricated mutation', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const repository = createGatewayTripRepository();
      expect(await repository.listTrips(request())).toEqual({
        status: 'error',
        error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: false },
      });
      expect(Object.keys(repository).sort()).toEqual(['getTrip', 'listTrips']);
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
        permissions: { canRead: true, canUpdate: false },
      });
    }
    expect(Object.keys(repository).sort()).toEqual(['getTrip', 'listTrips']);
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
            permissions: { canRead: true, canUpdate: false },
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
