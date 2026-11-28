import { describe, expect, it } from 'vitest';
import {
  createPlacesRepository,
  decodePlace,
} from '../src/infrastructure/repositories/places.gateway-repository';
import { parseEnvelope } from '../src/infrastructure/http/envelope';
import { activityTypeLabel, placeActivityType, placeSourceLabel } from '../src/features/map/places';

const geoapify = {
  id: 'geo-1',
  name: 'Hoi An POI',
  address: 'Quang Nam',
  coordinates: { latitude: 15.88, longitude: 108.33 },
  selection_token: 'signed',
  attribution: 'Geoapify / OpenStreetMap',
};
const hash = 'a'.repeat(64);
const photo = {
  url: `/api/v1/travel/poi-images/${hash}/1280.webp`,
  thumbnail_url: `/api/v1/travel/poi-images/${hash}/640.webp`,
  small_url: `/api/v1/travel/poi-images/${hash}/320.webp`,
  attribution: 'Ảnh An · CC BY-SA 4.0 · Wikimedia Commons',
  source_url: 'https://commons.wikimedia.org/wiki/File:Hoi_An.jpg',
  license: 'CC-BY-SA-4.0',
  is_placeholder: false,
};

describe('MAP-POI place decoding', () => {
  it('reads the additive curated-store fields', () => {
    const place = decodePlace({
      ...geoapify,
      id: 'dn-cho-han',
      name: 'Chợ Hàn',
      description: '  Khu chợ truyền thống gần sông Hàn.  ',
      categories: ['market'],
      attribution: '© OpenStreetMap contributors',
      provider: 'WOLFARI',
      category: 'market',
      category_label: 'Chợ',
      tier: 1,
      coord_verified: false,
      typical_duration_min: 60,
      activity_type: 'SHOPPING',
      dress_code_hint: '',
    });
    expect(place).toMatchObject({
      id: 'dn-cho-han',
      provider: 'WOLFARI',
      description: 'Khu chợ truyền thống gần sông Hàn.',
      categories: ['market'],
      category: 'market',
      categoryLabel: 'Chợ',
      tier: 1,
      coordVerified: false,
      typicalDurationMin: 60,
      activityType: 'SHOPPING',
      dressCodeHint: null,
      token: 'signed',
    });
  });

  it('keeps working with the previous Geoapify-only response', () => {
    expect(decodePlace(geoapify)).toMatchObject({
      provider: 'GEOAPIFY',
      description: null,
      categories: [],
      category: null,
      categoryLabel: null,
      tier: null,
      coordVerified: null,
      typicalDurationMin: null,
      activityType: null,
    });
  });

  it('drops malformed optional fields instead of rejecting the place', () => {
    const place = decodePlace({
      ...geoapify,
      provider: 'SOMETHING',
      tier: 7,
      coord_verified: 'yes',
      typical_duration_min: -5,
      category_label: 42,
      description: 42,
      categories: ['a', 3],
    });
    expect(place).toMatchObject({
      provider: 'GEOAPIFY',
      tier: null,
      coordVerified: null,
      typicalDurationMin: null,
      categoryLabel: null,
      description: null,
      categories: ['a'],
    });
    expect(decodePlace({ ...geoapify, description: '   ' }).description).toBeNull();
    expect(() =>
      decodePlace({ ...geoapify, coordinates: { latitude: 99, longitude: 1 } }),
    ).toThrow();
  });
  it('accepts licensed same-origin photos and ignores unsafe or uncredited optional images', () => {
    expect(decodePlace({ ...geoapify, hero_image: photo }).heroImage).toMatchObject({
      url: photo.url,
      thumbnailUrl: photo.thumbnail_url,
      smallUrl: photo.small_url,
      attribution: photo.attribution,
      sourceUrl: photo.source_url,
    });
    for (const extra of [
      { url: 'https://untrusted.test/photo.webp' },
      { thumbnail_url: photo.small_url },
      { attribution: '' },
      { license: 'ALL_RIGHTS_RESERVED' },
      { source_url: 'javascript:alert(1)' },
    ]) {
      expect(decodePlace({ ...geoapify, hero_image: { ...photo, ...extra } }).heroImage).toBeNull();
    }
  });

  it('preserves route attribution, transport mode and stale source metadata', async () => {
    const coordinates = [
      { latitude: 16, longitude: 108 },
      { latitude: 16.1, longitude: 108.1 },
    ];
    let sent: unknown;
    const envelope = parseEnvelope({
      data: { distance_m: 1000, duration_seconds: 600, geometry: coordinates },
      meta: {
        provider: 'OSRM',
        status: 'SUCCESS',
        stale: true,
        is_mock: false,
        fetched_at: '2026-11-25T00:00:00Z',
        warnings: ['PROVIDER_UNAVAILABLE'],
        attribution: [
          { text: '© OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright' },
          { text: 'unsafe', url: 'javascript:alert(1)' },
        ],
      },
    });
    if (envelope.kind !== 'success') throw Error('Expected route');
    const repository = createPlacesRepository({
      read: async () => {
        throw Error('Unexpected read');
      },
      write: async (_path, options) => {
        sent = options.body;
        return { data: envelope.data, metadata: envelope.metadata, correlationId: null };
      },
    });
    const result = await repository.route(coordinates, new AbortController().signal, 'CYCLING');
    expect(sent).toEqual({ coordinates, mode: 'CYCLING' });
    expect(result.source).toMatchObject({
      provider: 'OSRM',
      stale: true,
      isMock: false,
      attribution: [
        { text: '© OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright' },
        { text: 'unsafe', url: null },
      ],
    });
  });

  it.each(['GEOAPIFY', 'WOLFARI', 'WOLFARI+GEOAPIFY'])(
    'accepts places metadata from provider %s',
    (provider) => {
      const envelope = parseEnvelope({
        data: [],
        meta: { provider, status: 'SUCCESS', stale: false, fetched_at: null, warnings: ['W'] },
      });
      expect(envelope.kind === 'success' && envelope.metadata.placesSource).toEqual({
        provider,
        status: 'SUCCESS',
        stale: false,
        fetchedAt: null,
        warnings: ['W'],
      });
    },
  );

  it('ignores unknown places providers', () => {
    const envelope = parseEnvelope({
      data: [],
      meta: { provider: 'GOOGLE', status: 'SUCCESS', stale: false },
    });
    expect(envelope.kind === 'success' && envelope.metadata.placesSource).toBeUndefined();
  });

  it('labels sources and activity types, showing unknown types as "Khác"', () => {
    expect(placeSourceLabel('WOLFARI')).toBe('Wolfari');
    expect(placeSourceLabel('geoapify')).toBe('Geoapify');
    expect(placeSourceLabel(null)).toBe('Thủ công');
    expect(activityTypeLabel('SHOPPING')).toBe('Mua sắm');
    expect(activityTypeLabel('MEAL')).toBe('Ẩm thực');
    expect(activityTypeLabel('ZIPLINE')).toBe('Khác');
    expect(placeActivityType({ activityType: 'shopping' })).toBe('SHOPPING');
    expect(placeActivityType({ activityType: null })).toBe('SIGHTSEEING');
    expect(placeActivityType(null)).toBe('SIGHTSEEING');
  });
});
