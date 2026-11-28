import { describe, expect, it } from 'vitest';
import { centerProvinceCode, otherProvinceName } from '../src/features/map/places';

describe('POI-OVERTURE W14 province beside the address', () => {
  const daNang = { latitude: 16.0544, longitude: 108.2022 };
  const places = [
    { latitude: 16.061, longitude: 108.227, provinceCode: '48' }, // Cầu Rồng, ~3 km
    { latitude: 21.03, longitude: 105.85, provinceCode: '01' }, // Hà Nội
    { latitude: 16.06, longitude: 108.21, provinceCode: null },
  ];

  it('takes the centre province from the nearest coded result within 15 km', () => {
    expect(centerProvinceCode(places, daNang)).toBe('48');
    expect(centerProvinceCode(places.slice(1), daNang)).toBeNull();
    expect(centerProvinceCode([], daNang)).toBeNull();
  });

  it('names only provinces that differ from the centre', () => {
    expect(otherProvinceName({ provinceCode: '01' }, '48')).toBe('Hà Nội');
    expect(otherProvinceName({ provinceCode: '01', provinceName: 'TP. Hà Nội' }, '48')).toBe(
      'TP. Hà Nội',
    );
    expect(otherProvinceName({ provinceCode: '48' }, '48')).toBeNull();
    expect(otherProvinceName({ provinceCode: '1' }, '01')).toBeNull();
    expect(otherProvinceName({ provinceCode: '01' }, null)).toBeNull();
    expect(otherProvinceName({ provinceCode: null }, '48')).toBeNull();
  });
});
