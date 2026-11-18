import { describe, expect, it } from 'vitest';
import {
  applyPlacement,
  globalPositionFor,
  type PlacementDay,
} from '../src/features/plan/model/plan-placement';

const D1 = '2026-11-01',
  D2 = '2026-11-02',
  D3 = '2026-11-03';
type Row = { id: string; position: number; day: PlacementDay };
const rows = (...items: [string, PlacementDay][]): Row[] =>
  items.map(([id, day], position) => ({ id, position, day }));
const base = rows(['a1', D1], ['a2', D1], ['b1', D2], ['b2', D2], ['b3', D2], ['p1', null]);
const dayOf = (row: Row) => row.day;

/** Apply the same move the backend would and read the target day back in order. */
function moved(movingId: string, targetDay: PlacementDay, targetIndex: number, list = base) {
  const position = globalPositionFor({
    orderedActivities: list,
    dayOf,
    targetDay,
    targetIndex,
    movingId,
  });
  const next = applyPlacement(list, movingId, position, { day: targetDay });
  return {
    position,
    day: next.filter((row) => row.day === targetDay).map((row) => row.id),
    positions: next.map((row) => row.position),
  };
}

describe('globalPositionFor', () => {
  it('places into an empty day before the first later day and keeps the pool last', () => {
    expect(moved('a1', D3, 0)).toMatchObject({ position: 4, day: ['a1'] });
    expect(
      globalPositionFor({
        orderedActivities: base,
        dayOf,
        targetDay: '2026-10-31',
        targetIndex: 0,
      }),
    ).toBe(0);
    const noPool = base.filter((row) => row.day !== null);
    expect(
      globalPositionFor({ orderedActivities: noPool, dayOf, targetDay: null, targetIndex: 0 }),
    ).toBe(noPool.length);
  });

  it('inserts at the start, middle and end of another day', () => {
    expect(moved('a1', D2, 0)).toMatchObject({ position: 1, day: ['a1', 'b1', 'b2', 'b3'] });
    expect(moved('a1', D2, 1)).toMatchObject({ position: 2, day: ['b1', 'a1', 'b2', 'b3'] });
    expect(moved('a1', D2, 3)).toMatchObject({ position: 4, day: ['b1', 'b2', 'b3', 'a1'] });
  });

  it('uses array-move semantics inside one day in both directions', () => {
    expect(moved('b1', D2, 2)).toMatchObject({ position: 4, day: ['b2', 'b3', 'b1'] });
    expect(moved('b3', D2, 0)).toMatchObject({ position: 2, day: ['b3', 'b1', 'b2'] });
    expect(moved('b2', D2, 1)).toMatchObject({ position: 3, day: ['b1', 'b2', 'b3'] });
  });

  it('moves across days forward and backward, including to the pool', () => {
    expect(moved('b2', D1, 1)).toMatchObject({ position: 1, day: ['a1', 'b2', 'a2'] });
    expect(moved('a2', D3, 0)).toMatchObject({ position: 4, day: ['a2'] });
    expect(moved('b1', null, 0)).toMatchObject({ position: 4, day: ['b1', 'p1'] });
    expect(moved('p1', D1, 2)).toMatchObject({ position: 2, day: ['a1', 'a2', 'p1'] });
  });

  it('clamps indexes and supports a new activity without a moving id', () => {
    expect(moved('a1', D2, 99).day).toEqual(['b1', 'b2', 'b3', 'a1']);
    expect(moved('a1', D2, -4).day).toEqual(['a1', 'b1', 'b2', 'b3']);
    expect(
      globalPositionFor({ orderedActivities: base, dayOf, targetDay: D2, targetIndex: 3 }),
    ).toBe(5);
    expect(
      globalPositionFor({ orderedActivities: base, dayOf, targetDay: D1, targetIndex: 2 }),
    ).toBe(2);
  });

  it('works when Trip order interleaves days', () => {
    const mixed = rows(['b1', D2], ['a1', D1], ['b2', D2]);
    expect(
      globalPositionFor({ orderedActivities: mixed, dayOf, targetDay: D1, targetIndex: 1 }),
    ).toBe(2);
    expect(moved('b2', D1, 0, mixed)).toMatchObject({ position: 1, day: ['b2', 'a1'] });
  });
});

describe('applyPlacement', () => {
  it('renumbers positions densely and keeps untouched objects', () => {
    const result = moved('b3', D2, 0);
    expect(result.positions).toEqual([0, 1, 2, 3, 4, 5]);
    const next = applyPlacement(base, 'a1', 0);
    expect(next.map((row) => row.id)).toEqual(base.map((row) => row.id));
    expect(next[1]).toBe(base[1]);
    expect(applyPlacement(base, 'missing', 0)).toEqual(base);
  });
});
