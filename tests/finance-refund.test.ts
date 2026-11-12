import { expect, it } from 'vitest';
import {
  validateCommandBody,
  commandRoute,
} from '../src/infrastructure/operations/command-coordinator';
import { decodeRefund } from '../src/infrastructure/repositories/finance-extended-decoders';
const id = '11111111-1111-4111-8111-111111111111';
it('validates refund wire actions without adding a reason to reasonless actions', () => {
  const versions = { expected_version: 1, expected_finance_version: 1 };
  for (const kind of [
    'refund-report-paid',
    'refund-confirm-received',
    'refund-consent-reversal',
  ] as const) {
    expect(() => validateCommandBody(kind, versions)).not.toThrow();
    expect(() => validateCommandBody(kind, { ...versions, reason: 'x' })).toThrow();
  }
  for (const kind of [
    'refund-confirm-nonreceipt',
    'refund-cancel',
    'refund-request-reversal',
    'refund-reverse',
  ] as const) {
    expect(() => validateCommandBody(kind, versions)).toThrow();
    expect(() => validateCommandBody(kind, { ...versions, reason: 'Đối chiếu' })).not.toThrow();
    expect(commandRoute({ kind, tripId: id, fundId: id, resourceId: id }).path).toBe(
      `/api/v1/refunds/${id}/${kind.slice(7)}`,
    );
  }
  expect(() =>
    validateCommandBody('refund-create', {
      member_user_id: id,
      amount: '0',
      reason: 'x',
      expected_finance_version: 1,
    }),
  ).toThrow();
  expect(() =>
    validateCommandBody('refund-create', {
      member_user_id: id,
      amount: '9007199254740993',
      reason: 'x',
      expected_finance_version: 1,
    }),
  ).not.toThrow();
});
it('requires complete refund timestamps and scope', () => {
  const row = {
    id,
    fund_id: id,
    member_user_id: id,
    amount: '1',
    reason: 'x',
    status: 'HOLDER_REPORTED',
    holder_reported_at: '2026-11-12T00:00:00Z',
    confirmed_at: null,
    nonreceipt_confirmed_at: null,
    reversal_requested_at: null,
    reversal_consented_at: null,
    created_at: '2026-11-12T00:00:00Z',
    updated_at: '2026-11-12T00:00:00Z',
    version: 1,
    finance_version: 1,
  };
  expect(decodeRefund(row, id).status).toBe('HOLDER_REPORTED');
  expect(() => decodeRefund({ ...row, nonreceipt_confirmed_at: undefined }, id)).toThrow();
  expect(() => decodeRefund({ ...row, status: 'PAID' }, id)).toThrow();
  expect(() => decodeRefund(row, '22222222-2222-4222-8222-222222222222')).toThrow();
});
