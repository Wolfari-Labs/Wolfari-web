import { describe, expect, it } from 'vitest';
import { decodePlace } from '../src/infrastructure/repositories/places.gateway-repository';
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

describe('MAP-POI place decoding', () => {
  it('reads the additive curated-store fields', () => {
    const place = decodePlace({
      ...geoapify,
      id: 'dn-cho-han',
      name: 'Chợ Hàn',
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
      categories: ['a', 3],
    });
    expect(place).toMatchObject({
      provider: 'GEOAPIFY',
      tier: null,
      coordVerified: null,
      typicalDurationMin: null,
      categoryLabel: null,
      categories: ['a'],
    });
    expect(() =>
      decodePlace({ ...geoapify, coordinates: { latitude: 99, longitude: 1 } }),
    ).toThrow();
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
