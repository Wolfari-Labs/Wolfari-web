import { expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { decodeClosure } from '../src/infrastructure/repositories/finance-closure-decoder';
import {
  createCommandCoordinator,
  validateCommandBody,
} from '../src/infrastructure/operations/command-coordinator';
import type { GatewayHttpClient } from '../src/infrastructure/http/http-client';
import { closureFixture, closureFund, closureTrip, closureId } from './finance-closure-fixture';
it('checks snapshot scope, version, schema, hash and exact required confirmations', () => {
  const row = closureFixture(closureTrip);
  expect(decodeClosure(row, closureFund, closureTrip).snapshot_finance_version).toBe(2);
  for (const change of [
    { snapshot_hash: 'wrong' },
    { snapshot_finance_version: 3 },
    { snapshot_schema_version: 2 },
    { confirmations: [] },
  ])
    expect(() => decodeClosure({ ...row, ...change }, closureFund, closureTrip)).toThrow();
  expect(() => decodeClosure(row, closureFund, closureId)).toThrow();
  expect(() =>
    validateCommandBody('closure-confirm', { snapshot_hash: row.snapshot_hash }),
  ).not.toThrow();
  expect(() =>
    validateCommandBody('closure-confirm', {
      snapshot_hash: row.snapshot_hash,
      expected_version: 2,
    }),
  ).toThrow();
  expect(() => validateCommandBody('closure-cancel', { reason: ' ' })).toThrow();
  expect(() => validateCommandBody('closure-remind', {})).not.toThrow();
});
it('recognizes accepted reminder without treating it as a pending operation or delivery', async () => {
  vi.stubGlobal('crypto', webcrypto);
  sessionStorage.clear();
  const client = {
    read: vi.fn<GatewayHttpClient['read']>(),
    write: vi.fn<GatewayHttpClient['write']>(),
  };
  client.write.mockImplementation(async (_path, options) => ({
    status: 202,
    data: { accepted: true, operation_id: options.idempotencyKey, closure_id: closureId },
    correlationId: null,
  }));
  const session = createCommandCoordinator(
    client,
    () => {
      throw Error('Not entity receipt');
    },
    sessionStorage,
  ).forScope(closureTrip, closureTrip);
  await session.submit({
    kind: 'closure-remind',
    actorId: closureTrip,
    tripId: closureTrip,
    fundId: closureFund,
    resourceId: closureId,
    body: {},
  });
  expect(session.getSnapshot().state).toBe('SUCCEEDED');
  expect(session.getSnapshot().receipt).toEqual({ accepted: true });
  expect(client.write).toHaveBeenCalledTimes(1);
});
