import { expect, it } from 'vitest';
import {
  commandRoute,
  validateCommandBody,
} from '../src/infrastructure/operations/command-coordinator';
const id = '11111111-1111-4111-8111-111111111111';
it('requires a bounded Unicode reason and both versions for contribution reversal', () => {
  const body = { reason: 'Điều chỉnh TEST', expected_version: 2, expected_finance_version: 3 };
  expect(() => validateCommandBody('contribution-reverse', body)).not.toThrow();
  for (const reason of ['', ' ', null, 'a\0b', 'a'.repeat(1025)])
    expect(() => validateCommandBody('contribution-reverse', { ...body, reason })).toThrow();
  expect(() =>
    validateCommandBody('contribution-reverse', { ...body, reason: '😀'.repeat(1024) }),
  ).not.toThrow();
  expect(() =>
    validateCommandBody('contribution-reverse', { ...body, expected_version: 0 }),
  ).toThrow();
  expect(() => validateCommandBody('contribution-reverse', { ...body, amount: '1' })).toThrow();
  expect(
    commandRoute({ kind: 'contribution-reverse', tripId: id, fundId: id, resourceId: id }),
  ).toEqual({ method: 'POST', path: `/api/v1/contributions/${id}/reverse` });
});
