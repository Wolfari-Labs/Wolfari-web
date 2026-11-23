import { describe, expect, it, vi } from 'vitest';
import type { CommandCoordinator } from '../src/infrastructure/operations/command-coordinator';
import { commandRoute, validateCommandBody } from '../src/infrastructure/operations/command-coordinator';
import type { GatewayHttpClient } from '../src/infrastructure/http/http-client';
import { createGatewayFundRepository } from '../src/infrastructure/repositories/fund.gateway-repository';
import {
  decodeBankTransfer,
  decodeClosureReadiness,
} from '../src/infrastructure/repositories/finance-operations-decoders';

const id = '11111111-1111-4111-8111-111111111111';
const transfer = {
  id,
  provider: 'SEPAY',
  provider_transaction_id: 'provider-123',
  transfer_type: 'IN',
  amount: '9007199254740993',
  content: 'Missing contribution reference',
  account_number_masked: '****1234',
  bank_gateway: 'VCB',
  processing_status: 'NEEDS_REVIEW',
  contribution_id: null,
  review_reason: 'NO_REFERENCE',
  transaction_at: null,
  received_at: '2026-11-23T08:00:00Z',
  processed_at: '2026-11-23T08:00:01Z',
  resolution: null,
  resolution_note: null,
  resolved_by_user_id: null,
  resolved_at: null,
};
describe('bank transfer contract', () => {
  it('uses the durable resolution command route and validates the exact request fields', () => {
    expect(
      commandRoute({
        kind: 'bank-transfer-resolve',
        tripId: id,
        fundId: id,
        resourceId: id,
      }),
    ).toEqual({ path: `/api/v1/funds/${id}/bank-transfers/${id}/resolve`, method: 'POST' });
    const body = {
      resolution: 'HANDLED_IN_APP',
      note: 'Contribution was confirmed manually.',
      expected_finance_version: 4,
    };
    expect(() => validateCommandBody('bank-transfer-resolve', body)).not.toThrow();
    expect(() =>
      validateCommandBody('bank-transfer-resolve', { ...body, expected_version: 4 }),
    ).toThrow();
    expect(() => validateCommandBody('bank-transfer-resolve', { ...body, note: '  ' })).toThrow();
    expect(() =>
      validateCommandBody('bank-transfer-resolve', { ...body, note: 'x'.repeat(501) }),
    ).toThrow();
  });

  it('keeps transfer amounts as decimal strings and validates resolution state', () => {
    expect(decodeBankTransfer(transfer, id).amount).toBe('9007199254740993');
    expect(() =>
      decodeBankTransfer(
        {
          ...transfer,
          processing_status: 'RESOLVED',
          resolution: 'NOT_OURS',
        },
        id,
      ),
    ).toThrow();
  });

  it('decodes readiness and enforces its review blocker count', () => {
    const readiness = {
      ready: false,
      fund_status: 'OPEN',
      current_balance: '0',
      blockers: [{ kind: 'BANK_TRANSFERS_REVIEW', count: 2 }],
      bank_transfers_needing_review: 2,
    };
    expect(decodeClosureReadiness(readiness).bank_transfers_needing_review).toBe(2);
    expect(() =>
      decodeClosureReadiness({ ...readiness, bank_transfers_needing_review: 0 }),
    ).toThrow();
  });

  it('reads bank transfers and closure readiness using authenticated Fund routes', async () => {
    const client = {
      read: vi.fn<GatewayHttpClient['read']>(),
      write: vi.fn<GatewayHttpClient['write']>(),
    };
    client.read
      .mockResolvedValueOnce({
        status: 200,
        data: { items: [transfer] },
        correlationId: null,
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          ready: true,
          fund_status: 'OPEN',
          current_balance: '0',
          blockers: [],
          bank_transfers_needing_review: 0,
        },
        correlationId: null,
      });
    const runtime = createGatewayFundRepository(
      undefined,
      client,
      {} as CommandCoordinator,
    ).runtime!;
    expect(await runtime.bankTransfers!(id)).toMatchObject([
      { id, processing_status: 'NEEDS_REVIEW', amount: '9007199254740993' },
    ]);
    expect(await runtime.closureReadiness!(id)).toMatchObject({ ready: true, blockers: [] });
    expect(client.read.mock.calls).toEqual([
      [`/api/v1/funds/${id}/bank-transfers`, { includeCredentials: true }],
      [`/api/v1/funds/${id}/closure-readiness`, { includeCredentials: true }],
    ]);
  });
});
