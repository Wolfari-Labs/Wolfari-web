import { describe, expect, it } from 'vitest';
import {
  commandRoute,
  validateCommandBody,
} from '../src/infrastructure/operations/command-coordinator';
import {
  decodeHandover,
  decodeHistory,
  decodeRefund,
} from '../src/infrastructure/repositories/finance-extended-decoders';
import {
  decodeBank,
  decodeFinanceReceipt,
} from '../src/infrastructure/repositories/finance-decoders';

const fund = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const oldHolder = '33333333-3333-4333-8333-333333333333';
const newHolder = '44444444-4444-4444-8444-444444444444';
const at = '2026-11-16T03:00:00.000Z';
const snapshot = {
  current_balance: '500000',
  reserved_refund: '100000',
  available_balance: '400000',
  ledger_sequence: '3',
  fingerprint: 'a'.repeat(64),
  pending_contribution_ids: [id],
  pending_refund_ids: [],
  pending_expense_ids: [],
  pending_payment_ids: [],
  payment_destination_ids: [id],
  pending_payment_exception_ids: [],
};
const handover = {
  id,
  fund_id: fund,
  old_holder_user_id: oldHolder,
  new_holder_user_id: newHolder,
  nominated_by_user_id: oldHolder,
  status: 'ACCEPTED',
  version: 2,
  finance_version: 7,
  snapshot_finance_version: 7,
  snapshot,
  snapshot_stale: false,
  accepted_at: at,
  old_holder_confirmed_at: null,
  new_holder_confirmed_at: null,
  completed_at: null,
  cancelled_at: null,
  cancellation_reason: null,
  created_at: at,
  updated_at: at,
};

describe('Holder handover (FR-FN06)', () => {
  it('decodes a handover and enforces snapshot consistency', () => {
    expect(decodeHandover(handover, fund)).toMatchObject({ status: 'ACCEPTED', snapshot });
    expect(() => decodeHandover({ ...handover, fund_id: id }, fund)).toThrow();
    expect(() => decodeHandover({ ...handover, snapshot: null }, fund)).toThrow();
    expect(() =>
      decodeHandover({ ...handover, snapshot: { ...snapshot, available_balance: '1' } }, fund),
    ).toThrow();
    expect(() => decodeHandover({ ...handover, new_holder_user_id: oldHolder }, fund)).toThrow();
    expect(
      decodeHandover(
        { ...handover, status: 'NOMINATED', snapshot: null, snapshot_finance_version: null },
        fund,
      ).snapshot,
    ).toBeNull();
  });
  it('validates each command body and routes it to the Gateway path', () => {
    const versions = { expected_version: 2, expected_finance_version: 7 };
    expect(() =>
      validateCommandBody('handover-create', {
        new_holder_user_id: newHolder,
        expected_finance_version: 7,
      }),
    ).not.toThrow();
    expect(() =>
      validateCommandBody('handover-create', {
        new_holder_user_id: '',
        expected_finance_version: 7,
      }),
    ).toThrow();
    for (const kind of ['handover-accept', 'handover-refresh-snapshot'] as const) {
      expect(() => validateCommandBody(kind, versions)).not.toThrow();
      expect(() => validateCommandBody(kind, { ...versions, reason: 'x' })).toThrow();
    }
    expect(() =>
      validateCommandBody('handover-confirm', {
        ...versions,
        expected_snapshot_finance_version: 7,
      }),
    ).not.toThrow();
    expect(() => validateCommandBody('handover-confirm', versions)).toThrow();
    expect(() => validateCommandBody('handover-cancel', { ...versions, reason: ' ' })).toThrow();
    expect(() =>
      validateCommandBody('handover-cancel', { ...versions, reason: 'Đổi kế hoạch' }),
    ).not.toThrow();
    expect(commandRoute({ kind: 'handover-create', tripId: fund, fundId: fund })).toEqual({
      path: `/api/v1/funds/${fund}/holder-handovers`,
      method: 'POST',
    });
    for (const action of ['accept', 'refresh-snapshot', 'confirm', 'cancel'] as const)
      expect(
        commandRoute({ kind: `handover-${action}`, tripId: fund, fundId: fund, resourceId: id }),
      ).toEqual({ path: `/api/v1/holder-handovers/${id}/${action}`, method: 'POST' });
  });
  it('rejects stale or mismatched command receipts', () => {
    const intent = (
      kind: string,
      body: Record<string, unknown>,
      versions: Record<string, number>,
    ) => ({ kind, tripId: fund, fundId: fund, resourceId: id, body, versions }) as never;
    expect(() =>
      decodeFinanceReceipt(
        { ...handover, version: 3 },
        intent('handover-confirm', {}, { expected_version: 2 }),
      ),
    ).not.toThrow();
    expect(() =>
      decodeFinanceReceipt(handover, intent('handover-confirm', {}, { expected_version: 2 })),
    ).toThrow('Stale handover receipt');
    expect(() =>
      decodeFinanceReceipt(
        { ...handover, status: 'NOMINATED', snapshot: null, snapshot_finance_version: null },
        {
          kind: 'handover-create',
          tripId: fund,
          fundId: fund,
          body: { new_holder_user_id: oldHolder },
          versions: {},
        } as never,
      ),
    ).toThrow('Invalid handover receipt');
  });
});

describe('Refund verification fields (BE-02/BE-04)', () => {
  const refund = {
    id,
    fund_id: fund,
    member_user_id: oldHolder,
    amount: '100000',
    status: 'CONFIRMED',
    reason: 'Hoàn phần dư',
    reversal_reason: 'Chuyển nhầm',
    verifier_user_id: newHolder,
    verifier_assigned_by_user_id: oldHolder,
    verifier_assigned_at: at,
    confirmed_by_user_id: newHolder,
    confirmation_mode: 'ASSIGNED_MEMBER',
    independent_verification: true,
    holder_reported_at: at,
    confirmed_at: at,
    nonreceipt_confirmed_at: null,
    reversal_requested_at: at,
    reversal_consented_at: null,
    created_at: at,
    updated_at: at,
    version: 3,
    finance_version: 9,
  };
  it('keeps the reversal reason and verifier, and tolerates older Gateways', () => {
    expect(decodeRefund(refund, fund)).toMatchObject({
      reversal_reason: 'Chuyển nhầm',
      verifier_user_id: newHolder,
      confirmation_mode: 'ASSIGNED_MEMBER',
      independent_verification: true,
    });
    const legacy: Record<string, unknown> = { ...refund };
    for (const key of [
      'reversal_reason',
      'verifier_user_id',
      'verifier_assigned_by_user_id',
      'verifier_assigned_at',
      'confirmed_by_user_id',
      'confirmation_mode',
      'independent_verification',
    ])
      delete legacy[key];
    expect(decodeRefund(legacy, fund)).toMatchObject({
      reversal_reason: null,
      verifier_user_id: null,
      confirmation_mode: null,
    });
    expect(() => decodeRefund({ ...refund, confirmation_mode: 'GUESS' }, fund)).toThrow();
  });
  it('validates and routes the assign-verifier command', () => {
    const versions = { expected_version: 3, expected_finance_version: 9 };
    expect(() =>
      validateCommandBody('refund-assign-verifier', { ...versions, verifier_user_id: newHolder }),
    ).not.toThrow();
    expect(() => validateCommandBody('refund-assign-verifier', versions)).toThrow();
    expect(
      commandRoute({ kind: 'refund-assign-verifier', tripId: fund, fundId: fund, resourceId: id })
        .path,
    ).toBe(`/api/v1/refunds/${id}/assign-verifier`);
  });
});

describe('Bank directory and history', () => {
  it('decodes NAPAS banks and rejects malformed BINs', () => {
    expect(
      decodeBank({ code: 'VCB', bin: '970436', name: 'Vietcombank', short_name: 'Vietcombank' }),
    ).toMatchObject({ code: 'VCB', bin: '970436' });
    expect(() => decodeBank({ code: 'X', bin: '12', name: 'x', short_name: 'x' })).toThrow();
  });
  it('accepts the SePay bank webhook as a system actor in audit history', () => {
    expect(
      decodeHistory(
        {
          id,
          fund_id: fund,
          actor_user_id: null,
          system_actor: 'BANK_WEBHOOK:SEPAY',
          action: 'CONFIRM_BANK_TRANSFER',
          entity_type: 'Contribution',
          entity_id: id,
          from_version: 1,
          to_version: 2,
          reason: null,
          occurred_at: at,
          correlation_id: id,
        },
        fund,
      ).system_actor,
    ).toBe('BANK_WEBHOOK:SEPAY');
  });
});

describe('Conflict sub-reasons', () => {
  it('maps known reasons to Vietnamese text and ignores unknown ones', async () => {
    const { errorReasonMessage } = await import('../src/shared/components/OperationStatus');
    expect(errorReasonMessage({ reason: 'INSUFFICIENT_AVAILABLE_BALANCE' })).toMatch(/Số dư/);
    expect(errorReasonMessage({ reason: 'MEMBER_ACTIVE_WATCH_LIMIT' })).toMatch(/20 theo dõi/);
    expect(errorReasonMessage({ reason: 'SOMETHING_NEW' })).toBeNull();
    expect(errorReasonMessage(null)).toBeNull();
    expect(errorReasonMessage({ current_version: 3 })).toBeNull();
  });
});
