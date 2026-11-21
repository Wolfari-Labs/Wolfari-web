import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { decodePlace } from '../src/infrastructure/repositories/places.gateway-repository';
import { parseEnvelope } from '../src/infrastructure/http/envelope';
import {
  bboxText,
  OVERTURE_NOTE,
  parsePlaceGroup,
  placeCategoryLabel,
  placeDataset,
  placeDate,
  placeSearchParams,
  PLACE_GROUPS,
  provinceName,
  resultProvenance,
  savedLocationDataset,
  savedPlaceActivityType,
  savedProvenance,
} from '../src/features/map/places';
import { PlaceSourceBadges } from '../src/features/map/PlaceSourceBadges';

const legacy = {
  id: 'geo-1',
  name: 'Hoi An POI',
  address: 'Quang Nam',
  coordinates: { latitude: 15.88, longitude: 108.33 },
  selection_token: 'signed',
  attribution: 'Geoapify / OpenStreetMap',
};
const golden = {
  ...legacy,
  id: 'dn-cho-han',
  name: 'Chợ Hàn',
  attribution: '© OpenStreetMap contributors',
  provider: 'WOLFARI',
  category: 'market',
  category_label: 'Chợ',
  tier: 1,
  coord_verified: true,
  activity_type: 'SHOPPING',
  source_dataset: 'golden',
  category_group: 'tourism',
  province_code: '48',
  confidence: null,
  data_release: null,
  fetched_at: '2026-11-18T03:00:00Z',
};
const overture = {
  ...legacy,
  id: 'ovt-08f2',
  name: 'Nhà thuốc Long Châu',
  attribution: '© Overture Maps Foundation; Foursquare (Apache-2.0)',
  provider: 'WOLFARI',
  category: 'traveler_service',
  tier: 9,
  coord_verified: false,
  source_dataset: 'overture',
  category_group: 'services',
  province_code: '79',
  confidence: 0.82,
  data_release: '2026-10-22.0',
  fetched_at: '2026-11-18T17:30:00Z',
};
const geoapify = {
  ...legacy,
  provider: 'GEOAPIFY',
  tier: 9,
  coord_verified: false,
  source_dataset: 'geoapify',
  category_group: 'tourism',
  fetched_at: '2026-11-17T00:00:00Z',
};

describe('POI-OVERTURE W10 decoding', () => {
  it('keeps a pre-Overture payload working with every new field empty', () => {
    const place = decodePlace(legacy);
    expect(place).toMatchObject({
      provider: 'GEOAPIFY',
      sourceDataset: null,
      categoryGroup: null,
      provinceCode: null,
      confidence: null,
      dataRelease: null,
      fetchedAt: null,
    });
    expect(placeDataset(place)).toBe('geoapify');
    // Old rows keep the row fallback label instead of "Khác".
    expect(resultProvenance(place).categoryLabel).toBeNull();
  });

  it('reads a golden Wolfari record', () => {
    const place = decodePlace(golden);
    expect(place).toMatchObject({
      sourceDataset: 'golden',
      categoryGroup: 'tourism',
      provinceCode: '48',
      confidence: null,
      fetchedAt: '2026-11-18T03:00:00Z',
    });
    expect(resultProvenance(place)).toEqual({
      dataset: 'golden',
      categoryLabel: 'Chợ',
      provinceName: 'Đà Nẵng',
      dataRelease: null,
      fetchedAt: '18/11/2026',
      attribution: '© OpenStreetMap contributors',
      coordVerified: true,
    });
  });

  it('reads an Overture record (provider WOLFARI, tier 9)', () => {
    const place = decodePlace(overture);
    expect(place).toMatchObject({
      provider: 'WOLFARI',
      tier: 9,
      coordVerified: false,
      sourceDataset: 'overture',
      categoryGroup: 'services',
      provinceCode: '79',
      confidence: 0.82,
      dataRelease: '2026-10-22.0',
    });
    expect(resultProvenance(place)).toMatchObject({
      dataset: 'overture',
      categoryLabel: 'Tiện ích cho khách',
      provinceName: 'TP. Hồ Chí Minh',
      dataRelease: '22/10/2026',
      // 17:30Z is already 19/11 in Vietnam (UTC+7).
      fetchedAt: '19/11/2026',
      attribution: '© Overture Maps Foundation; Foursquare (Apache-2.0)',
    });
  });

  it('reads a Geoapify record', () => {
    const place = decodePlace(geoapify);
    expect(place).toMatchObject({ provider: 'GEOAPIFY', sourceDataset: 'geoapify' });
    expect(placeDataset(place)).toBe('geoapify');
  });

  it('drops malformed additive fields instead of rejecting the place', () => {
    const place = decodePlace({
      ...overture,
      source_dataset: 'google',
      province_code: 'HCM',
      confidence: 3,
      data_release: 42,
      fetched_at: 'yesterday',
    });
    expect(place).toMatchObject({
      sourceDataset: null,
      provinceCode: null,
      confidence: null,
      dataRelease: null,
      fetchedAt: null,
    });
    // Without source_dataset a WOLFARI row is treated as the curated store, as before.
    expect(placeDataset(place)).toBe('golden');
  });

  it('reads the additive search meta and stays optional', () => {
    const envelope = parseEnvelope({
      data: [],
      meta: {
        provider: 'WOLFARI',
        status: 'SUCCESS',
        stale: false,
        fetched_at: null,
        warnings: [],
        snapshot_id: 'snap-7',
        data_release: '2026-10-22.0',
        bbox_truncated: true,
      },
    });
    expect(envelope.kind === 'success' && envelope.metadata.placesSource).toMatchObject({
      snapshotId: 'snap-7',
      dataRelease: '2026-10-22.0',
      bboxTruncated: true,
    });
  });
});

describe('POI-OVERTURE W10 labels', () => {
  it.each([
    ['accommodation', 'Lưu trú'],
    ['bar_nightlife', 'Bar và giải trí đêm'],
    ['shopping', 'Mua sắm'],
    ['entertainment', 'Giải trí'],
    ['sports_recreation', 'Thể thao và vận động'],
    ['wellness', 'Spa, massage và chăm sóc'],
    ['transport_hub', 'Sân bay, ga, bến xe, bến tàu'],
    ['traveler_service', 'Tiện ích cho khách'],
    ['other', 'Khác'],
  ])('labels %s as %s', (code, label) => expect(placeCategoryLabel(code)).toBe(label));

  it('prefers the API label and falls back to "Khác"', () => {
    expect(placeCategoryLabel('market', 'Chợ truyền thống')).toBe('Chợ truyền thống');
    expect(placeCategoryLabel('ufo_site')).toBe('Khác');
    expect(placeCategoryLabel(null)).toBe('Khác');
  });

  it('shows province names only for known codes', () => {
    expect(provinceName('48')).toBe('Đà Nẵng');
    expect(provinceName('1')).toBe('Hà Nội');
    expect(provinceName('49')).toBeNull();
    expect(provinceName(null)).toBeNull();
  });

  it('formats release tags and timestamps as dd/MM/yyyy', () => {
    expect(placeDate('2026-10-22.0')).toBe('22/10/2026');
    expect(placeDate('2026-11-18T01:00:00Z')).toBe('18/11/2026');
    expect(placeDate('not a date')).toBeNull();
  });

  it('recognises saved places by provider and attribution', () => {
    const saved = (provider: string | null, attribution?: string, source = 'PROVIDER') => ({
      source,
      provider,
      fetchedAt: '2026-11-18T03:00:00Z',
      metadata: attribution ? { attribution, categories: ['market'] } : {},
    });
    expect(savedLocationDataset(saved('GEOAPIFY'))).toBe('geoapify');
    expect(savedLocationDataset(saved('WOLFARI', '© OpenStreetMap contributors'))).toBe('golden');
    expect(savedLocationDataset(saved('WOLFARI', overture.attribution))).toBe('overture');
    expect(savedLocationDataset(saved(null, undefined, 'MANUAL'))).toBe('manual');
    expect(savedProvenance(saved('WOLFARI', overture.attribution))).toMatchObject({
      dataset: 'overture',
      categoryLabel: 'Chợ',
      fetchedAt: '18/11/2026',
      attribution: overture.attribution,
    });
    // Geoapify categories such as tourism.sights have no Wolfari label.
    expect(
      savedProvenance({ ...saved('GEOAPIFY'), metadata: { categories: ['tourism.sights'] } })
        .categoryLabel,
    ).toBeNull();
  });

  it('takes the activity type of a saved place from the catalogue, then its category', () => {
    expect(savedPlaceActivityType({ activityType: 'MUSEUM' }, { categories: ['market'] })).toBe(
      'MUSEUM',
    );
    expect(savedPlaceActivityType(null, { categories: ['market'] })).toBe('SHOPPING');
    expect(savedPlaceActivityType(null, { categories: ['tourism.sights', 'beach'] })).toBe('BEACH');
    expect(savedPlaceActivityType(null, {})).toBe('SIGHTSEEING');
  });

  it('badges Overture with a tooltip and no per-row unverified warning', () => {
    const { rerender } = render(<PlaceSourceBadges dataset="overture" coordVerified={false} />);
    expect(screen.getByText('Overture')).toHaveAttribute('title', OVERTURE_NOTE);
    expect(screen.queryByText('Chưa xác minh vị trí')).toBeNull();
    rerender(<PlaceSourceBadges dataset="golden" coordVerified={false} />);
    expect(screen.getByText('Wolfari')).not.toHaveAttribute('title');
    expect(screen.getByText('Chưa xác minh vị trí')).toBeInTheDocument();
    rerender(<PlaceSourceBadges dataset="golden" coordVerified={true} />);
    expect(screen.queryByText('Chưa xác minh vị trí')).toBeNull();
    rerender(<PlaceSourceBadges dataset="geoapify" coordVerified={false} />);
    expect(screen.getByText('Geoapify')).toBeInTheDocument();
    expect(screen.queryByText('Chưa xác minh vị trí')).toBeNull();
  });
});

describe('POI-OVERTURE W11 search parameters', () => {
  const center = { latitude: 16.0544, longitude: 108.2022 };

  it('omits category when no chip is chosen (backend default groups)', () => {
    const params = placeSearchParams({
      mode: 'query',
      query: 'cho han',
      center,
      group: null,
      geocode: false,
    });
    expect(params.has('category')).toBe(false);
    expect(Object.fromEntries(params)).toEqual({
      q: 'cho han',
      geocode: 'false',
      latitude: '16.0544',
      longitude: '108.2022',
      radius_m: '5000',
    });
  });

  it('sends the chip category with a keyword', () => {
    const params = placeSearchParams({
      mode: 'query',
      query: 'atm',
      center,
      group: 'services',
      geocode: false,
    });
    expect(params.get('category')).toBe('services');
    expect(params.has('bbox')).toBe(false);
  });

  it('builds a bbox query without radius or keyword', () => {
    const params = placeSearchParams({
      mode: 'bbox',
      bounds: { west: 108.1234567, south: 16.0123456, east: 108.25, north: 16.1 },
      group: 'all',
    });
    expect(Object.fromEntries(params)).toEqual({
      category: 'all',
      bbox: '108.123457,16.012346,108.25,16.1',
      limit: '150',
    });
    expect(bboxText({ west: 108.12345, south: 16.01234, east: 108.2, north: 16.1 }, 3)).toBe(
      '108.123,16.012,108.2,16.1',
    );
  });

  it('accepts only the documented group values from the URL', () => {
    expect(PLACE_GROUPS.map((group) => group.label)).toEqual([
      'Du lịch',
      'Ăn uống',
      'Cà phê',
      'Lưu trú',
      'Bar',
      'Mua sắm',
      'Giải trí',
      'Spa',
      'Giao thông',
      'Tiện ích',
      'Mọi nhóm',
    ]);
    expect(parsePlaceGroup('services')).toBe('services');
    expect(parsePlaceGroup('SERVICES')).toBeNull();
    expect(parsePlaceGroup('other')).toBeNull();
    expect(parsePlaceGroup(null)).toBeNull();
  });
});
