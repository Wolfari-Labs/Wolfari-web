import { describe, it, expect } from 'vitest';
import { validPlaceIntent } from '../src/features/map/places';
describe('Map command recovery journal', () => {
  const trip = '10000000-0000-4000-8000-000000000001';
  const intent = {
    path: `/api/v1/trips/${trip}/selected-locations`,
    method: 'POST',
    body: { expected_plan_version: 1 },
    key: trip,
  };
  it('accepts only a scoped write intent', () => expect(validPlaceIntent(intent, trip)).toBe(true));
  it.each([
    null,
    {},
    { ...intent, path: '/api/v1/trips/other/selected-locations' },
    { ...intent, path: `/api/v1/trips/${trip}/members` },
    { ...intent, method: 'GET' },
    { ...intent, body: [] },
    { ...intent, key: '' },
    { ...intent, body: { expected_plan_version: '1' } },
  ])('fails closed on corrupt/cross-scope draft %j', (value) =>
    expect(validPlaceIntent(value, trip)).toBe(false),
  );
});
