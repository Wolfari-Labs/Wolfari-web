import { expect, it } from 'vitest';
import { decodeHistory } from '../src/infrastructure/repositories/finance-extended-decoders';
const id = '11111111-1111-4111-8111-111111111111';
it('preserves history microseconds, nullable versions, system actor and unknown actions', () => {
  const row = {
    id,
    fund_id: id,
    actor_user_id: null,
    system_actor: 'MOMO_IPN',
    action: 'FUTURE_ACTION',
    entity_type: 'Refund',
    entity_id: null,
    from_version: null,
    to_version: 2,
    reason: null,
    occurred_at: '2026-11-12T00:00:00.123456Z',
    correlation_id: id,
  };
  expect(decodeHistory(row, id)).toEqual(row);
  for (const change of [
    { action: 'bad action' },
    { system_actor: 'UNKNOWN' },
    { from_version: undefined },
    { occurred_at: 'bad' },
  ])
    expect(() => decodeHistory({ ...row, ...change }, id)).toThrow();
  expect(() => decodeHistory(row, '22222222-2222-4222-8222-222222222222')).toThrow();
});
