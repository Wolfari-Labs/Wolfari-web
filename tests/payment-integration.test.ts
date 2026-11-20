import { beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  createCommandCoordinator,
  validateCommandBody,
  commandRoute,
} from '../src/infrastructure/operations/command-coordinator';
import { decodeFinanceReceipt } from '../src/infrastructure/repositories/finance-decoders';
import { decodePaymentAttempt } from '../src/infrastructure/repositories/payment-decoders';
import { createPaymentRecovery } from '../src/infrastructure/repositories/payment-recovery';
import { ApiError } from '../src/infrastructure/http/api-error';
import type { GatewayHttpClient } from '../src/infrastructure/http/http-client';
const actor = '11111111-1111-4111-8111-111111111111',
  trip = '22222222-2222-4222-8222-222222222222',
  id = '33333333-3333-4333-8333-333333333333';
const attempt = {
  id,
  contribution_id: id,
  provider: 'MOMO_SANDBOX',
  environment: 'SANDBOX',
  amount: '9223372036854775807',
  currency: 'VND',
  status: 'PENDING',
  needs_reconciliation: false,
  payment_url: 'https://test-payment.momo.vn/pay',
  expires_at: null,
  error_code: null,
  created_at: '2026-11-20T00:00:00Z',
  updated_at: '2026-11-20T00:00:00Z',
};
beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal('crypto', webcrypto);
});
it('accepts Sandbox only and rejects unsafe payment redirects without losing money precision', () => {
  expect(decodePaymentAttempt(attempt).amount).toBe(attempt.amount);
  for (const payment_url of [
    'http://test-payment.momo.vn/pay',
    'https://test-payment.momo.vn.evil.test/',
    'https://evil@test-payment.momo.vn/',
    'javascript:alert(1)',
  ])
    expect(() => decodePaymentAttempt({ ...attempt, payment_url })).toThrow();
  expect(() => decodePaymentAttempt({ ...attempt, environment: 'LIVE' })).toThrow();
});
it('recovers an unknown create with the same key and decodes a 202 attempt, not a settled payment', async () => {
  const client = {
    read: vi.fn<GatewayHttpClient['read']>(),
    write: vi.fn<GatewayHttpClient['write']>(),
  };
  client.write.mockRejectedValueOnce(new ApiError('lost', 'network', null, null, null, false));
  const coordinator = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage);
  const session = coordinator.forScope(actor, trip);
  await session.submit({
    kind: 'payment-create',
    actorId: actor,
    tripId: trip,
    fundId: trip,
    resourceId: id,
    body: { provider: 'MOMO_SANDBOX', expected_version: 1, expected_finance_version: 1 },
  });
  expect(session.getSnapshot().state).toBe('UNKNOWN');
  const original = client.write.mock.calls[0];
  coordinator.invalidate();
  const restored = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage).forScope(
    actor,
    trip,
  );
  client.write.mockResolvedValueOnce({ status: 202, data: attempt, correlationId: null });
  await restored.retry();
  expect(client.write.mock.calls[1]?.[1].idempotencyKey).toBe(original?.[1].idempotencyKey);
  expect(restored.getSnapshot().state).toBe('SUCCEEDED');
  expect(restored.getSnapshot().receipt).toMatchObject({ status: 'PENDING' });
});
it('accepts a terminal 202 reconcile operation from current backend', async () => {
  const client = {
    read: vi.fn<GatewayHttpClient['read']>(),
    write: vi.fn<GatewayHttpClient['write']>(),
  };
  client.write.mockImplementation(async (_, options) => ({
    status: 202,
    correlationId: null,
    data: {
      operation_id: options.idempotencyKey,
      trip_id: trip,
      state: 'SUCCEEDED',
      outcome: { status: 'COMMITTED', blocking_ids: [] },
    },
  }));
  const session = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage).forScope(
    actor,
    trip,
  );
  await session.submit({
    kind: 'payment-reconcile',
    actorId: actor,
    tripId: trip,
    fundId: trip,
    resourceId: id,
    body: { reason: 'Kiểm tra' },
  });
  expect(session.getSnapshot().state).toBe('SUCCEEDED');
});
it('validates resolution and keeps recovery IDs actor/trip scoped', () => {
  const body = {
    resolution: 'LINKED',
    linked_attempt_id: id,
    reason: 'Đã kiểm tra',
    expected_finance_version: 1,
    previous_holder_transfer_confirmed: true,
  };
  expect(() => validateCommandBody('payment-resolve', body)).not.toThrow();
  expect(() =>
    validateCommandBody('payment-resolve', { ...body, resolution: 'NO_FINANCIAL_EFFECT' }),
  ).toThrow();
  expect(
    commandRoute({ kind: 'payment-resolve', fundId: trip, tripId: trip, resourceId: id }).path,
  ).toBe(`/api/v1/payment-exceptions/${id}/resolve`);
  const recovery = createPaymentRecovery(sessionStorage);
  recovery.save(actor, trip, id, actor);
  recovery.save(actor, trip, trip, id);
  expect(recovery.list(actor, trip)).toEqual({ [actor]: id, [id]: trip });
  expect(recovery.list(id, trip)).toEqual({});
  recovery.save(actor, trip, id);
  expect(recovery.load(actor, trip)).toBe(id);
  expect(recovery.load(id, trip)).toBe('');
});
