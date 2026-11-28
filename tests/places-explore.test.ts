import { describe, expect, it, vi } from 'vitest';
import { clusterPoints, CLUSTER_MAX_ZOOM, projectPx } from '../src/features/map/map-cluster';
import {
  exploreCacheKey,
  LruCache,
  placeDataCredit,
  resultProvenance,
  savedLocationDataset,
} from '../src/features/map/places';
import {
  createPlacesRepository,
  decodePlace,
} from '../src/infrastructure/repositories/places.gateway-repository';
import { ApiError } from '../src/infrastructure/http/api-error';
import type { GatewayHttpClient } from '../src/infrastructure/http/http-client';

const point = (id: string, latitude: number, longitude: number, clusterable = true) => ({
  id,
  latitude,
  longitude,
  clusterable,
});

describe('POI-OVERTURE W12 grid clustering', () => {
  // Around Hàn market, Đà Nẵng: ~10 m apart, and one point ~5 km away.
  const near = [
    point('a', 16.068, 108.224),
    point('b', 16.0681, 108.2241),
    point('c', 16.0682, 108.2239),
  ];
  const far = point('far', 16.03, 108.25);

  it('merges close points into one cluster at city zoom', () => {
    const items = clusterPoints([...near, far], 12);
    expect(items).toHaveLength(2);
    const cluster = items.find((item) => item.kind === 'cluster');
    expect(cluster).toMatchObject({ kind: 'cluster', count: 3 });
    expect(cluster?.kind === 'cluster' && cluster.points.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(items.find((item) => item.kind === 'point')).toMatchObject({ point: { id: 'far' } });
  });

  it('places the cluster at the centroid of its points', () => {
    const [cluster] = clusterPoints(near, 12);
    expect(cluster?.kind).toBe('cluster');
    if (cluster?.kind !== 'cluster') return;
    expect(cluster.latitude).toBeCloseTo(16.0681, 6);
    expect(cluster.longitude).toBeCloseTo(108.224, 6);
  });

  it('splits clusters as the zoom grows and stops clustering at the max zoom', () => {
    const at18 = clusterPoints(near, CLUSTER_MAX_ZOOM);
    expect(at18.every((item) => item.kind === 'point')).toBe(true);
    // ~320 m apart: one cell (~2.2 km) at zoom 12, separate cells (~130 m) at zoom 16.
    const pair = [point('x', 16.068, 108.21), point('y', 16.068, 108.213)];
    expect(clusterPoints(pair, 12).map((item) => item.kind)).toEqual(['cluster']);
    expect(clusterPoints(pair, 16).map((item) => item.kind)).toEqual(['point', 'point']);
  });

  it('keeps non-clusterable points (curated, saved, Plan day maps) single', () => {
    const golden = point('golden', 16.068, 108.224, false);
    const plain = { id: 'plan', latitude: 16.06805, longitude: 108.22405 };
    const items = clusterPoints([golden, plain, ...near], 12);
    expect(
      items.filter((item) => item.kind === 'point').map((i) => i.kind === 'point' && i.point.id),
    ).toEqual(['golden', 'plan']);
    expect(items.filter((item) => item.kind === 'cluster')).toHaveLength(1);
  });

  it('handles 300 points quickly and loses none', () => {
    const many = Array.from({ length: 300 }, (_, i) =>
      point(`p${i}`, 16 + (i % 20) * 0.004, 108.15 + Math.floor(i / 20) * 0.004),
    );
    const started = performance.now();
    const items = clusterPoints(many, 13);
    expect(performance.now() - started).toBeLessThan(50);
    const total = items.reduce((sum, item) => sum + (item.kind === 'cluster' ? item.count : 1), 0);
    expect(total).toBe(300);
    expect(items.length).toBeLessThan(300);
  });

  it('projects Web Mercator pixels', () => {
    expect(projectPx(0, 0, 0)).toEqual({ x: 128, y: 128 });
    expect(projectPx(0, 180, 1).x).toBe(512);
  });
});

describe('POI-OVERTURE W12 explore cache', () => {
  const bounds = { west: 108.12349, south: 16.01234, east: 108.25, north: 16.1 };

  it('keys by bbox rounded to 3 decimals and the chip group', () => {
    expect(exploreCacheKey(bounds, null)).toBe('108.123,16.012,108.25,16.1|');
    expect(exploreCacheKey({ ...bounds, west: 108.12301 }, 'services')).toBe(
      '108.123,16.012,108.25,16.1|services',
    );
  });

  it('evicts the least recently used entry beyond 30', () => {
    const cache = new LruCache<number>(30);
    for (let i = 0; i < 30; i++) cache.set(`k${i}`, i);
    expect(cache.get('k0')).toBe(0); // refresh k0
    cache.set('k30', 30);
    expect(cache.size).toBe(30);
    expect(cache.get('k1')).toBeUndefined();
    expect(cache.get('k0')).toBe(0);
    expect(cache.get('k30')).toBe(30);
  });
});

describe('POI-OVERTURE W12 explore request', () => {
  const meta = {
    provider: 'WOLFARI',
    status: 'SUCCESS',
    stale: false,
    fetchedAt: null,
    warnings: [],
  };
  const client = (read: GatewayHttpClient['read']) =>
    ({ read, write: vi.fn() }) as unknown as GatewayHttpClient;
  const params = new URLSearchParams({ bbox: '108.1,16,108.3,16.1', limit: '150' });
  const httpError = (status: number, code: string) =>
    new ApiError('x', 'http', status, code, null, false);

  it('returns found places and passes the abort signal through', async () => {
    const read = vi.fn().mockResolvedValue({
      data: [],
      metadata: { placesSource: { ...meta, bboxTruncated: true } },
    });
    const controller = new AbortController();
    const outcome = await createPlacesRepository(client(read)).explore(
      'trip',
      params,
      controller.signal,
    );
    expect(outcome).toMatchObject({ kind: 'found', items: [], source: { bboxTruncated: true } });
    expect(read).toHaveBeenCalledWith(
      '/api/v1/trips/trip/places/search?bbox=108.1%2C16%2C108.3%2C16.1&limit=150',
      { signal: controller.signal },
    );
  });

  it('maps BBOX_TOO_LARGE to a zoom-in outcome', async () => {
    const read = vi.fn().mockRejectedValue(httpError(400, 'BBOX_TOO_LARGE'));
    await expect(
      createPlacesRepository(client(read)).explore('trip', params, new AbortController().signal),
    ).resolves.toEqual({ kind: 'too-large' });
  });

  it('treats other 400s from an older backend as unsupported, INVALID_BBOX as an error', async () => {
    const repo = (error: ApiError) =>
      createPlacesRepository(client(vi.fn().mockRejectedValue(error)));
    await expect(
      repo(httpError(400, 'VALIDATION_FAILED')).explore('t', params, new AbortController().signal),
    ).resolves.toEqual({ kind: 'unsupported' });
    await expect(
      repo(httpError(400, 'INVALID_BBOX')).explore('t', params, new AbortController().signal),
    ).rejects.toBeInstanceOf(ApiError);
    await expect(
      repo(httpError(503, 'SERVICE_UNAVAILABLE')).explore(
        't',
        params,
        new AbortController().signal,
      ),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('rejects when an older request is aborted by a newer one', async () => {
    const read = vi.fn(
      (_path: string, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) =>
          options.signal.addEventListener('abort', () =>
            reject(new DOMException('', 'AbortError')),
          ),
        ),
    ) as unknown as GatewayHttpClient['read'];
    const repo = createPlacesRepository(client(read));
    const first = new AbortController();
    const pending = repo.explore('t', params, first.signal);
    first.abort();
    await expect(pending).rejects.toThrow();
  });
});

describe('POI-OVERTURE W10 follow-up and W13 credit', () => {
  const base = {
    id: 'ov-08f2a',
    name: 'Bến xe Trung tâm',
    coordinates: { latitude: 16.06, longitude: 108.17 },
    selection_token: 't',
    attribution: '© Overture Maps Foundation; Foursquare (Apache-2.0)',
    provider: 'WOLFARI',
    source_dataset: 'overture',
  };

  it('prefers province_name from the API over the code table', () => {
    expect(
      resultProvenance(decodePlace({ ...base, province_code: '48', province_name: 'TP. Đà Nẵng' }))
        .provinceName,
    ).toBe('TP. Đà Nẵng');
    expect(resultProvenance(decodePlace({ ...base, province_code: '48' })).provinceName).toBe(
      'Đà Nẵng',
    );
    expect(resultProvenance(decodePlace({ ...base, province_code: '49' })).provinceName).toBeNull();
  });

  it('recognises a saved Overture place by its ov- key, attribution only as fallback', () => {
    const saved = (providerPlaceId: string, attribution?: string) => ({
      source: 'PROVIDER',
      provider: 'WOLFARI',
      providerPlaceId,
      metadata: attribution ? { attribution } : {},
    });
    expect(savedLocationDataset(saved('ov-08f2a'))).toBe('overture');
    expect(savedLocationDataset(saved('dn-cho-han', '© OpenStreetMap contributors'))).toBe(
      'golden',
    );
    expect(savedLocationDataset(saved('legacy-id', base.attribution))).toBe('overture');
  });

  it('credits only the sources present in the results', () => {
    const golden = {
      provider: 'WOLFARI' as const,
      sourceDataset: 'golden' as const,
      dataRelease: null,
    };
    const overture = {
      provider: 'WOLFARI' as const,
      sourceDataset: 'overture' as const,
      dataRelease: '2026-10-22.0',
    };
    const geoapify = { provider: 'GEOAPIFY' as const, sourceDataset: null, dataRelease: null };
    expect(placeDataCredit([])).toBeNull();
    expect(placeDataCredit([golden])).toBe('Dữ liệu địa điểm: Wolfari');
    expect(placeDataCredit([golden, overture, geoapify])).toBe(
      'Dữ liệu địa điểm: Wolfari, Overture Maps Foundation (bản 2026-10-22.0), Geoapify / © OpenStreetMap contributors',
    );
    expect(placeDataCredit([overture], '2026-11-01.0')).toBe(
      'Dữ liệu địa điểm: Overture Maps Foundation (bản 2026-11-01.0)',
    );
  });
});
