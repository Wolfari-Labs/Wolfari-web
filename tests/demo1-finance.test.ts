import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  createCommandCoordinator,
  decodeOperation,
  validateCommandBody,
} from '../src/infrastructure/operations/command-coordinator';
import {
  decodeContribution,
  decodeDestination,
  decodeFinanceReceipt,
  decodeFund,
  decodeInstruction,
  decodeLedger,
} from '../src/infrastructure/repositories/finance-decoders';
import { createGatewayFundRepository } from '../src/infrastructure/repositories/fund.gateway-repository';
import { ApiError } from '../src/infrastructure/http/api-error';
import type { GatewayHttpClient } from '../src/infrastructure/http/http-client';
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const actor = id(1),
  trip = id(2),
  fundId = id(3),
  contributionId = id(4);
const fund = {
  id: fundId,
  trip_id: trip,
  holder_user_id: actor,
  currency: 'VND',
  budget_amount: null,
  current_balance: '9007199254740993',
  reserved_refund: '1',
  available_balance: '9007199254740992',
  status: 'OPEN',
  finance_version: 8,
  closed_at: null,
};
const contribution = {
  id: contributionId,
  fund_id: fundId,
  request_id: id(5),
  member_user_id: actor,
  amount: '200000',
  status: 'PENDING',
  self_contribution: false,
  version: 3,
  finance_version: 8,
  member_reported_at: '2026-10-28T00:00:00Z',
  confirmed_at: null,
  confirmed_by_user_id: null,
  waived_reason: null,
  cancelled_reason: null,
  rejected_reason: 'Chưa nhận lần đầu',
};
const makeClient = () => ({
  read: vi.fn<GatewayHttpClient['read']>(),
  write: vi.fn<GatewayHttpClient['write']>(),
});
beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal('crypto', webcrypto);
});
describe('demo1 Finance wire boundary', () => {
  it('keeps int64 money exact and nullable budget distinct from zero', () => {
    expect(decodeFund(fund, trip).current_balance).toBe('9007199254740993');
    expect(decodeFund(fund, trip).budget_amount).toBeNull();
    for (const value of [9007199254740992, '9223372036854775808', '-1', '1.5', '01'])
      expect(() => decodeFund({ ...fund, current_balance: value }, trip)).toThrow();
    expect(() => decodeFund({ ...fund, available_balance: '0' }, trip)).toThrow();
    expect(() => decodeFund(fund, id(9))).toThrow();
  });
  it('requires rejection field and scope/types; does not infer state from last rejection', () => {
    expect(
      decodeContribution({ ...contribution, status: 'CONFIRMED' }, fundId).rejected_reason,
    ).toBe('Chưa nhận lần đầu');
    for (const patch of [
      { rejected_reason: undefined },
      { self_contribution: 'false' },
      { status: 'DRAFT' },
      { version: 0 },
      { fund_id: id(9) },
      { amount: '0' },
    ])
      expect(() => decodeContribution({ ...contribution, ...patch }, fundId)).toThrow();
  });
  it('accepts member metadata-only destinations but rejects partial private fields', () => {
    const destination = {
      id: id(6),
      fund_id: fundId,
      destination_type: 'VIETQR',
      is_default: true,
      active: true,
      version: 1,
      confirmed_by_holder_at: null,
    };
    expect(decodeDestination(destination, fundId)).not.toHaveProperty('account_number');
    expect(() => decodeDestination({ ...destination, bank_code: 'VCB' }, fundId)).toThrow();
    expect(() => decodeDestination({ ...destination, active: 1 }, fundId)).toThrow();
  });
  it('does not return provider QR URL to UI; never fetches it', () => {
    const result = decodeInstruction(
      {
        contribution_id: contributionId,
        amount: '200000',
        currency: 'VND',
        reference: 'TEST',
        recipient_name: 'TEST',
        bank_code: 'VCB',
        bank_bin: '970436',
        account_number: '123',
        environment: 'TEST',
        warning: 'TEST',
        qr_url: 'https://provider.invalid/private',
      },
      contributionId,
    );
    expect(result).not.toHaveProperty('qr_url');
  });
  it('ledger sequence stays a decimal string beyond Number precision', () => {
    const row = {
      id: id(7),
      fund_id: fundId,
      sequence: '9223372036854775807',
      direction: 'IN',
      transaction_type: 'CONTRIBUTION',
      amount: '200000',
      balance_after: '500000',
      contribution_id: contributionId,
      expense_id: null,
      refund_id: null,
      reversal_of_id: null,
      actor_user_id: actor,
      reason: null,
      created_at: '2026-10-28T00:00:00Z',
    };
    expect(decodeLedger(row, fundId).sequence).toBe('9223372036854775807');
    expect(() => decodeLedger({ ...row, sequence: 42 }, fundId)).toThrow();
  });
  it('Fund 403/503 are errors, only explicit not-found means absent; destinations are an array', async () => {
    const client = makeClient(),
      commands = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage),
      r = createGatewayFundRepository(undefined, client, commands).runtime!;
    for (const status of [403, 503]) {
      client.read.mockRejectedValueOnce(
        new ApiError(
          'failure',
          'http',
          status,
          status === 403 ? 'PERMISSION_DENIED' : 'SERVICE_UNAVAILABLE',
          null,
          false,
        ),
      );
      await expect(r.fund(trip)).rejects.toBeInstanceOf(ApiError);
    }
    client.read.mockRejectedValueOnce(
      new ApiError('missing', 'http', 404, 'RESOURCE_NOT_FOUND', null, false),
    );
    expect(await r.fund(trip)).toBeNull();
    client.read.mockResolvedValueOnce({ status: 200, data: [], correlationId: null });
    expect(await r.destinations(fundId)).toEqual([]);
    client.read.mockResolvedValueOnce({ status: 200, data: { items: [] }, correlationId: null });
    await expect(r.destinations(fundId)).rejects.toBeInstanceOf(ApiError);
  });
  it('validates paginated data and forwards cursor without calculating totals', async () => {
    const client = makeClient(),
      commands = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage),
      r = createGatewayFundRepository(undefined, client, commands).runtime!;
    client.read.mockResolvedValueOnce({
      status: 200,
      data: { items: [contribution], next_cursor: 'page_2' },
      correlationId: null,
    });
    expect((await r.contributions(fundId, 'page_1', undefined, 1)).nextCursor).toBe('page_2');
    expect(client.read.mock.calls[0]?.[0]).toContain('limit=1&cursor=page_1');
    client.read.mockResolvedValueOnce({
      status: 200,
      data: { items: [contribution, contribution], next_cursor: null },
      correlationId: null,
    });
    await expect(r.contributions(fundId)).rejects.toBeInstanceOf(ApiError);
  });
});
describe('demo1 immutable commands and recovery', () => {
  const definition = () => ({
    kind: 'confirm' as const,
    actorId: actor,
    tripId: trip,
    fundId,
    resourceId: contributionId,
    body: { expected_version: 3, expected_finance_version: 8 },
  });
  it('fails closed before sending when a durable recovery journal is unavailable', async () => {
    for (const storage of [
      undefined,
      {
        getItem: () => null,
        setItem: () => {
          throw Error('denied');
        },
        removeItem: () => undefined,
      } as unknown as Storage,
    ]) {
      const client = makeClient();
      const s = createCommandCoordinator(client, decodeFinanceReceipt, storage).forScope(
        actor,
        trip,
      );
      await s.submit(definition());
      expect(client.write).not.toHaveBeenCalled();
      expect(s.getSnapshot().state).not.toBe('SUCCEEDED');
    }
  });
  it('202 is pending, poll success replays same key/body for receipt, not an invented resource ID', async () => {
    const client = makeClient();
    client.write.mockImplementationOnce(async (_path, options) => ({
      status: 202,
      correlationId: null,
      data: { operation_id: options.idempotencyKey, trip_id: trip, state: 'PENDING_RECOVERY' },
    }));
    const s = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage).forScope(
      actor,
      trip,
    );
    await s.submit(definition());
    expect(s.getSnapshot().state).toBe('PENDING_RECOVERY');
    const key = s.getSnapshot().intent!.key;
    client.read.mockResolvedValueOnce({
      status: 200,
      correlationId: null,
      data: {
        operation_id: key,
        trip_id: trip,
        state: 'SUCCEEDED',
        outcome: { status: 'COMMITTED' },
      },
    });
    client.write.mockResolvedValueOnce({
      status: 200,
      correlationId: null,
      data: { ...contribution, status: 'CONFIRMED', version: 4, finance_version: 9 },
    });
    await s.check();
    expect(s.getSnapshot().state).toBe('SUCCEEDED');
    expect(s.getSnapshot().receipt).toMatchObject({ id: contributionId });
    expect(client.write.mock.calls[1]?.[1].idempotencyKey).toBe(key);
    expect(client.write.mock.calls[1]?.[1].body).toEqual(definition().body);
  });
  it('keeps unknown intent across reload and blocks another submit/double click', async () => {
    const client = makeClient();
    client.write.mockRejectedValue(new ApiError('timeout', 'timeout', null, null, null, true));
    const original = definition(),
      c = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage),
      s = c.forScope(actor, trip);
    await s.submit(original);
    original.body.expected_version = 99;
    await s.submit(original);
    expect(client.write).toHaveBeenCalledTimes(1);
    expect(s.getSnapshot().state).toBe('UNKNOWN');
    const recovered = createCommandCoordinator(
      client,
      decodeFinanceReceipt,
      sessionStorage,
    ).forScope(actor, trip);
    await recovered.retry();
    expect(client.write.mock.calls[1]?.[1].body).toEqual({
      expected_version: 3,
      expected_finance_version: 8,
    });
    expect(client.write.mock.calls[1]?.[1].idempotencyKey).toBe(
      client.write.mock.calls[0]?.[1].idempotencyKey,
    );
    expect(c.forScope(id(99), trip).getSnapshot().intent).toBeNull();
  });
  it('never stores recipient payload; reload requires fingerprint-matched reentry', async () => {
    const client = makeClient();
    client.write.mockRejectedValue(new ApiError('lost', 'network', null, null, null, true));
    const body = {
      holder_user_id: actor,
      currency: 'VND',
      destination: {
        destination_type: 'VIETQR',
        bank_code: 'VCB',
        account_number: 'PRIVATE123',
        account_name: 'PRIVATE-NAME',
        active: true,
        is_default: true,
      },
    };
    const s = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage).forScope(
      actor,
      trip,
    );
    await s.submit({ kind: 'enable', actorId: actor, tripId: trip, body });
    expect(JSON.stringify(sessionStorage)).not.toContain('PRIVATE');
    const recovered = createCommandCoordinator(
      client,
      decodeFinanceReceipt,
      sessionStorage,
    ).forScope(actor, trip);
    expect(recovered.getSnapshot().intent?.body).toBeUndefined();
    await recovered.retry({ ...body, budget_amount: '1' });
    expect(client.write).toHaveBeenCalledTimes(1);
    await recovered.retry(body);
    expect(client.write).toHaveBeenCalledTimes(2);
  });
  it('does not overwrite conflict or silently retry NEEDS_REVIEW', async () => {
    const client = makeClient();
    client.write.mockRejectedValueOnce(
      new ApiError('conflict', 'http', 409, 'VERSION_CONFLICT', null, false),
    );
    const s = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage).forScope(
      actor,
      trip,
    );
    await s.submit(definition());
    expect(s.getSnapshot().state).toBe('FAILED');
    await s.retry();
    expect(client.write).toHaveBeenCalledTimes(1);
    s.dismiss();
    client.write.mockImplementationOnce(async (_p, o) => ({
      status: 202,
      correlationId: null,
      data: { operation_id: o.idempotencyKey, trip_id: trip, state: 'NEEDS_REVIEW' },
    }));
    await s.submit(definition());
    expect(s.getSnapshot().state).toBe('NEEDS_REVIEW');
    await s.retry();
    s.dismiss();
    expect(s.getSnapshot().intent).not.toBeNull();
    expect(client.write).toHaveBeenCalledTimes(2);
  });
  it('poll failure never asserts the original write failed', async () => {
    const client = makeClient();
    client.write.mockRejectedValueOnce(new ApiError('lost', 'network', null, null, null, true));
    const s = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage).forScope(
      actor,
      trip,
    );
    await s.submit(definition());
    client.read.mockRejectedValueOnce(
      new ApiError('missing', 'http', 404, 'RESOURCE_NOT_FOUND', null, false),
    );
    await s.check();
    expect(s.getSnapshot().state).toBe('UNKNOWN');
  });
  it('membership decodes its operation, not Finance receipts, including after leave', async () => {
    const client = makeClient();
    client.write.mockImplementationOnce(async (_p, o) => ({
      status: 200,
      correlationId: null,
      data: {
        operation_id: o.idempotencyKey,
        trip_id: trip,
        state: 'SUCCEEDED',
        outcome: { status: 'COMMITTED' },
      },
    }));
    const decoder = vi.fn(),
      s = createCommandCoordinator(client, decoder, sessionStorage).forScope(actor, trip);
    await s.submit({
      kind: 'leave',
      actorId: actor,
      tripId: trip,
      body: { reason: 'Leave test', expected_membership_revision: 3 },
    });
    expect(s.getSnapshot().state).toBe('SUCCEEDED');
    expect(decoder).not.toHaveBeenCalled();
    expect(client.write.mock.calls[0]?.[0]).toBe(`/api/v1/trips/${trip}/leave`);
  });
  it('rejects malformed operation scope and unapproved journal fields', () => {
    const intent = { key: id(22), tripId: trip };
    expect(() =>
      decodeOperation({ operation_id: id(23), trip_id: trip, state: 'SUCCEEDED' }, intent),
    ).toThrow();
    expect(() =>
      decodeOperation(
        {
          operation_id: id(22),
          trip_id: trip,
          state: 'SUCCEEDED',
          outcome: { status: 'REJECTED' },
        },
        intent,
      ),
    ).toThrow();
    expect(() =>
      validateCommandBody('report', {
        expected_version: 1,
        expected_finance_version: 1,
        password: 'must-not-persist',
      }),
    ).toThrow();
  });
  it('fails closed and preserves a corrupt/oversized journal instead of replacing the uncertain command', async () => {
    const storageKey = `wolfari.demo1.operation.v1:${actor}:${trip}`;
    for (const raw of ['{', '', 'x'.repeat(150001)]) {
      sessionStorage.setItem(storageKey, raw);
      const client = makeClient(),
        s = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage).forScope(
          actor,
          trip,
        );
      await s.submit(definition());
      s.dismiss();
      await s.retry();
      expect(client.write).not.toHaveBeenCalled();
      expect(s.getSnapshot().recoveryBlocked).toBe(true);
      expect(sessionStorage.getItem(storageKey)).toBe(raw);
    }
  });
  it('account boundary aborts old requests; old session cannot replay for another actor', async () => {
    const client = makeClient();
    let finish: (v: { status: number; data: unknown; correlationId: null }) => void = () =>
      undefined;
    client.write.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const c = createCommandCoordinator(client, decodeFinanceReceipt, sessionStorage),
      s = c.forScope(actor, trip);
    const pending = s.submit(definition());
    await vi.waitFor(() => expect(client.write).toHaveBeenCalledTimes(1));
    c.invalidate();
    expect(client.write.mock.calls[0]?.[1].signal?.aborted).toBe(true);
    finish({ status: 200, data: contribution, correlationId: null });
    await pending;
    expect(s.getSnapshot().state).toBe('UNKNOWN');
    await s.retry();
    expect(client.write).toHaveBeenCalledTimes(1);
  });
});
