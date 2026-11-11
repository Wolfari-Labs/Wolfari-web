import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { createCommandCoordinator } from '../src/infrastructure/operations/command-coordinator';
import { decodeFinanceReceipt } from '../src/infrastructure/repositories/finance-decoders';
import { ApiError } from '../src/infrastructure/http/api-error';
import type { GatewayHttpClient } from '../src/infrastructure/http/http-client';
import {
  commandRoute,
  validateCommandBody,
} from '../src/infrastructure/operations/command-coordinator';
import { decodeExpense } from '../src/infrastructure/repositories/finance-extended-decoders';
const fund = '77777777-1111-4111-8111-111111111111',
  trip = '11111111-1111-4111-8111-111111111111',
  id = '22222222-2222-4222-8222-222222222222';
export const expense = {
  id,
  fund_id: fund,
  title: 'Khách sạn',
  amount: '200000',
  description: null,
  category: null,
  status: 'DRAFT',
  created_by_user_id: id,
  receipt_available: false,
  submitted_at: null,
  paid_at: null,
  payment_method: null,
  paid_by_user_id: null,
  confirmed_at: null,
  confirmed_by_user_id: null,
  rejected_reason: null,
  created_at: '2026-11-12T00:00:00Z',
  updated_at: '2026-11-12T00:00:00Z',
  version: 1,
  finance_version: 2,
};
describe('Finance expenses contract', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('crypto', webcrypto);
  });
  it('restores unknown expense intent with identical body/key after reload', async () => {
    const client = {
      read: vi.fn<GatewayHttpClient['read']>(),
      write: vi.fn<GatewayHttpClient['write']>(),
    };
    client.write.mockRejectedValueOnce(
      new ApiError('Lost response', 'network', null, null, null, false),
    );
    const coordinator = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage);
    const session = coordinator.forScope(id, trip);
    await session.submit({
      kind: 'expense-create',
      actorId: id,
      tripId: trip,
      fundId: fund,
      body: { title: 'Chi', amount: '200000', expected_finance_version: 1 },
    });
    expect(session.getSnapshot().state).toBe('UNKNOWN');
    const original = client.write.mock.calls[0];
    coordinator.invalidate();
    const restored = createCommandCoordinator(
      client,
      decodeFinanceReceipt,
      sessionStorage,
    ).forScope(id, trip);
    client.write.mockResolvedValueOnce({ status: 201, data: expense, correlationId: null });
    await restored.retry();
    expect(restored.getSnapshot().state).toBe('SUCCEEDED');
    expect(client.write.mock.calls[1]?.[1].idempotencyKey).toBe(original?.[1].idempotencyKey);
    expect(client.write.mock.calls[1]?.[1].body).toEqual(original?.[1].body);
  });
  it('requires successful operation and matching ID for deleted drafts', async () => {
    const client = {
      read: vi.fn<GatewayHttpClient['read']>(),
      write: vi.fn<GatewayHttpClient['write']>(),
    };
    client.write.mockImplementation(async (_path, options) => ({
      status: 200,
      correlationId: null,
      data: { operation_id: options.idempotencyKey, trip_id: trip, state: 'SUCCEEDED' },
    }));
    const session = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage).forScope(
      id,
      trip,
    );
    await session.submit({
      kind: 'expense-delete',
      actorId: id,
      tripId: trip,
      fundId: fund,
      resourceId: id,
      body: { expected_version: 1, expected_finance_version: 1 },
    });
    expect(session.getSnapshot().state).toBe('SUCCEEDED');
  });
  it('known permission or version rejection does not retry the mutation', async () => {
    for (const code of ['PERMISSION_DENIED', 'VERSION_CONFLICT']) {
      sessionStorage.clear();
      const client = {
        read: vi.fn<GatewayHttpClient['read']>(),
        write: vi.fn<GatewayHttpClient['write']>(),
      };
      client.write.mockRejectedValue(new ApiError('Rejected', 'http', 409, code, null, false));
      const session = createCommandCoordinator(
        client,
        decodeFinanceReceipt,
        sessionStorage,
      ).forScope(id, trip);
      await session.submit({
        kind: 'expense-submit',
        actorId: id,
        tripId: trip,
        fundId: fund,
        resourceId: id,
        body: { expected_version: 1, expected_finance_version: 1 },
      });
      expect(session.getSnapshot().state).toBe('FAILED');
      await session.retry();
      expect(client.write).toHaveBeenCalledTimes(1);
    }
  });
  it('routes all transitions and destructive draft operations', () => {
    for (const action of ['submit', 'withdraw', 'confirm', 'reject', 'reverse'] as const)
      expect(
        commandRoute({ kind: `expense-${action}`, tripId: trip, fundId: fund, resourceId: id }),
      ).toEqual({ method: 'POST', path: `/api/v1/expenses/${id}/${action}` });
    expect(
      commandRoute({ kind: 'expense-delete', tripId: trip, fundId: fund, resourceId: id }).method,
    ).toBe('DELETE');
  });
  it('validates money, versions, required confirmation and reasons', () => {
    expect(() =>
      validateCommandBody('expense-create', {
        title: 'Chi',
        amount: '9007199254740993',
        expected_finance_version: 1,
      }),
    ).not.toThrow();
    for (const amount of ['0', '-1', '1.2', '9223372036854775808'])
      expect(() =>
        validateCommandBody('expense-create', {
          title: 'Chi',
          amount,
          expected_finance_version: 1,
        }),
      ).toThrow();
    expect(() =>
      validateCommandBody('expense-confirm', { expected_version: 1, expected_finance_version: 1 }),
    ).toThrow();
    expect(() =>
      validateCommandBody('expense-reverse', {
        expected_version: 1,
        expected_finance_version: 1,
        reason: '',
      }),
    ).toThrow();
    expect(() =>
      validateCommandBody('expense-delete', {
        expected_version: 1,
        expected_finance_version: 1,
        amount: '1',
      }),
    ).toThrow();
  });
  it('checks scope/status and preserves exact money', () => {
    expect(decodeExpense(expense, fund).amount).toBe('200000');
    expect(() => decodeExpense(expense, id)).toThrow();
    expect(() => decodeExpense({ ...expense, status: 'PAID' }, fund)).toThrow();
  });
});
