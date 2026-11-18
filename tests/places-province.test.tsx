import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  centerProvinceCode,
  OVERTURE_NOTE,
  otherProvinceName,
  provenanceDate,
  provenanceTooltip,
  type PlaceProvenance,
} from '../src/features/map/places';
import { PlaceProvenanceLine } from '../src/features/map/PlaceSourceBadges';

const overture: PlaceProvenance = {
  dataset: 'overture',
  categoryLabel: 'Tiện ích cho khách',
  provinceName: 'Đà Nẵng',
  dataRelease: '22/10/2026',
  fetchedAt: '18/11/2026',
  attribution: '© Overture Maps Foundation; Foursquare (Apache-2.0)',
  coordVerified: false,
};

describe('POI-OVERTURE OVW-3 selected-card source line', () => {
  it('prefers the fetch date and puts notes + attribution in the tooltip', () => {
    expect(provenanceDate(overture)).toBe('18/11/2026');
    expect(provenanceDate({ fetchedAt: null, dataRelease: '22/10/2026' })).toBe('22/10/2026');
    expect(provenanceTooltip(overture)).toBe(`${OVERTURE_NOTE}. ${overture.attribution}`);
    expect(
      provenanceTooltip({
        ...overture,
        dataset: 'golden',
        attribution: '© OpenStreetMap contributors',
      }),
    ).toBe('Chưa xác minh vị trí. © OpenStreetMap contributors');
  });

  it('renders "<loại> · <tỉnh> · Nguồn: <badge> (date)" with a keyboard tooltip', async () => {
    // Radix tooltips measure their content; jsdom has no ResizeObserver.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    const user = userEvent.setup();
    const { container } = render(<PlaceProvenanceLine provenance={overture} />);
    expect(container.textContent).toBe(
      'Tiện ích cho khách · Đà Nẵng ·Nguồn: Overture (18/11/2026)',
    );
    const badge = screen.getByText('Overture', { exact: true });
    expect(badge).toHaveAttribute('tabindex', '0');
    await user.tab();
    expect(badge).toHaveFocus();
    expect((await screen.findAllByText(new RegExp(OVERTURE_NOTE))).length).toBeGreaterThan(0);
  });

  it('omits missing facts and the date', () => {
    const { container } = render(
      <PlaceProvenanceLine
        provenance={{
          ...overture,
          dataset: 'geoapify',
          categoryLabel: null,
          provinceName: null,
          fetchedAt: null,
          dataRelease: null,
          attribution: null,
        }}
      />,
    );
    expect(container.textContent).toBe('Nguồn: Geoapify');
    expect(screen.getByText('Geoapify')).not.toHaveAttribute('tabindex');
  });
});

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
