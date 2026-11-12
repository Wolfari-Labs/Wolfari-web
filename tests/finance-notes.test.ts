import { expect, it } from 'vitest';
import {
  validateCommandBody,
  commandRoute,
} from '../src/infrastructure/operations/command-coordinator';
import { decodeFinancialNote } from '../src/infrastructure/repositories/finance-extended-decoders';
const id = '11111111-1111-4111-8111-111111111111';
it('validates note permissions-independent wire fields and optional zero/null amounts', () => {
  for (const amount of [null, '0', '9007199254740993'])
    expect(() =>
      validateCommandBody('note-create', {
        description: 'Chi riêng',
        amount,
        payer_user_id: null,
        expected_finance_version: 1,
      }),
    ).not.toThrow();
  for (const amount of ['-1', '1.2', '9223372036854775808'])
    expect(() =>
      validateCommandBody('note-create', {
        description: 'Chi',
        amount,
        expected_finance_version: 1,
      }),
    ).toThrow();
  expect(() =>
    validateCommandBody('note-create', { description: ' ', expected_finance_version: 1 }),
  ).toThrow();
  expect(() =>
    validateCommandBody('note-edit', { expected_version: 1, expected_finance_version: 1 }),
  ).toThrow();
  expect(commandRoute({ kind: 'note-delete', tripId: id, fundId: id, resourceId: id })).toEqual({
    method: 'DELETE',
    path: '/api/v1/notes/' + id,
  });
});
it('rejects missing/scope-invalid notes', () => {
  const row = {
    id,
    fund_id: id,
    description: 'Chi',
    amount: null,
    payer_user_id: null,
    created_by_user_id: id,
    created_at: '2026-11-12T00:00:00Z',
    updated_at: '2026-11-12T00:00:00Z',
    version: 1,
    finance_version: 1,
  };
  expect(decodeFinancialNote(row, id).amount).toBeNull();
  expect(() => decodeFinancialNote({ ...row, amount: undefined }, id)).toThrow();
  expect(() =>
    decodeFinancialNote({ ...row, fund_id: '22222222-2222-4222-8222-222222222222' }, id),
  ).toThrow();
});
