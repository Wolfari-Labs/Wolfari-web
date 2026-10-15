import { describe, expect, it, vi } from 'vitest';
import {
  initialTripFilter,
  selectTrips,
  tripDateLabel,
} from '../src/features/trips/model/trip-list-query';
import type { TripListItem } from '../src/features/trips/model/trip-list';
import { fixtureTripCatalog } from '../src/infrastructure/fixtures/trip-catalog';

function canonical() {
  return fixtureTripCatalog.filter((item) => item.permissions.canRead);
}

describe('Trip List local projection queries', () => {
  it.each([
    ['  DA NANG  ', 'Đà Nẵng – Hội An'],
    ['da lat', 'Đà Lạt – Một chút bình yên'],
    ['PHU QUOC', 'Phú Quốc – Hẹn với biển'],
    ['NINH BÌNH', 'Ninh Bình – Giữa núi xanh'],
  ])(
    'matches the local name query %s without requiring Vietnamese diacritics',
    (name, expected) => {
      expect(
        selectTrips(fixtureTripCatalog, { ...initialTripFilter, name }).visible.map(
          (item) => item.name,
        ),
      ).toEqual([expected]);
    },
  );

  it('counts only readable active items and keeps lifecycle totals independent of name search', () => {
    const original = canonical()[0];
    if (!original) throw new Error('Expected canonical fixture');
    const inactive: TripListItem = {
      ...original,
      id: '99999999-9999-4999-8999-999999999999',
      currentMembership: {
        ...original.currentMembership,
        tripId: '99999999-9999-4999-8999-999999999999',
        leftAt: '2026-09-01T00:00:00+07:00',
      },
    };
    const result = selectTrips([...fixtureTripCatalog, inactive], {
      ...initialTripFilter,
      name: 'da lat',
      status: 'UPCOMING',
    });
    expect(result.counts).toEqual({ ALL: 6, UPCOMING: 3, ONGOING: 1, COMPLETED: 2, ARCHIVED: 0 });
    expect(result.visible.map((item) => item.name)).toEqual(['Đà Lạt – Một chút bình yên']);
    expect(result.visible).not.toContain(inactive);
  });

  it('sorts by start instant in either direction, restores listed order, and never mutates input', () => {
    const before = JSON.stringify(fixtureTripCatalog);
    const ascending = [
      'Ninh Bình – Giữa núi xanh',
      'Huế – Chậm một nhịp',
      'Đà Nẵng – Hội An',
      'Phú Quốc – Hẹn với biển',
      'Đà Lạt – Một chút bình yên',
      'Sài Gòn – Vũng Tàu',
    ];
    expect(
      selectTrips(fixtureTripCatalog, { ...initialTripFilter, sort: 'start-asc' }).visible.map(
        (item) => item.name,
      ),
    ).toEqual(ascending);
    expect(
      selectTrips(fixtureTripCatalog, { ...initialTripFilter, sort: 'start-desc' }).visible.map(
        (item) => item.name,
      ),
    ).toEqual([...ascending].reverse());
    expect(selectTrips(fixtureTripCatalog, initialTripFilter).visible).toEqual(canonical());
    expect(JSON.stringify(fixtureTripCatalog)).toBe(before);
  });

  it('orders equal start instants deterministically without depending on source order', () => {
    const original = canonical()[0];
    if (!original) throw new Error('Expected canonical fixture');
    const lower = {
      ...original,
      id: '11111111-1111-4111-8111-111111111111',
    };
    const higher = {
      ...original,
      id: '99999999-9999-4999-8999-999999999999',
      currentMembership: {
        ...original.currentMembership,
        tripId: '99999999-9999-4999-8999-999999999999',
      },
    };
    for (const sort of ['start-asc', 'start-desc'] as const)
      expect(
        selectTrips(Object.freeze([higher, lower]), { ...initialTripFilter, sort }).visible.map(
          (item) => item.id,
        ),
      ).toEqual([lower.id, higher.id]);
  });

  it('represents an archived filter with no matching source items as empty, with truthful totals', () => {
    const result = selectTrips(fixtureTripCatalog, { ...initialTripFilter, status: 'ARCHIVED' });
    expect(result.visible).toEqual([]);
    expect(result.counts.ARCHIVED).toBe(0);
    expect(result.counts.ALL).toBe(6);
  });

  it.each([
    ['2026-09-21T17:00:00Z', '2026-09-24T17:00:00Z', '22 – 25/09/2026'],
    ['2026-09-21T18:00:00Z', '2026-09-22T16:00:00Z', '22/09/2026'],
    ['2026-09-30T16:30:00Z', '2026-09-30T17:30:00Z', '30/09/2026 – 01/10/2026'],
    ['2026-12-31T16:30:00Z', '2026-12-31T17:30:00Z', '31/12/2026 – 01/01/2027'],
  ])('formats %s through %s in the trip timezone', (startAt, endAt, expected) => {
    expect(tripDateLabel({ startAt, endAt, timezone: 'Asia/Ho_Chi_Minh' })).toBe(expected);
  });

  it('keeps fixture lifecycle and dates stable when the ambient clock changes', () => {
    const records = canonical();
    const original = records[0];
    if (!original) throw new Error('Expected canonical fixture');
    const expected = selectTrips(records, initialTripFilter);
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      for (const date of ['2000-01-01T00:00:00Z', '2040-01-01T00:00:00Z']) {
        vi.setSystemTime(new Date(date));
        const result = selectTrips(records, initialTripFilter);
        expect(result.counts).toEqual(expected.counts);
        expect(result.visible.map((item) => item.lifecycle)).toEqual(
          expected.visible.map((item) => item.lifecycle),
        );
        expect(tripDateLabel(original)).toBe('22 – 25/09/2026');
      }
    } finally {
      vi.useRealTimers();
    }
  });
});
