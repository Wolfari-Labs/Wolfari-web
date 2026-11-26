import * as d from '../http/decode';
import type {
  Expense,
  FinancialNote,
  Refund,
  FinanceHistory,
  HandoverSnapshot,
  HolderHandover,
} from '../../features/fund/model/runtime-fund';
const ids = (value: unknown) => d.list(value, d.uuid);
function decodeSnapshot(value: unknown): HandoverSnapshot {
  const r = d.object(value);
  const balance = d.money(r.current_balance),
    reserved = d.money(r.reserved_refund),
    available = d.money(r.available_balance);
  if (BigInt(balance) - BigInt(reserved) !== BigInt(available)) throw Error('Invalid snapshot');
  const fingerprint = d.string(r.fingerprint);
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw Error('Invalid fingerprint');
  return {
    current_balance: balance,
    reserved_refund: reserved,
    available_balance: available,
    ledger_sequence: d.money(r.ledger_sequence),
    fingerprint,
    pending_contribution_ids: ids(r.pending_contribution_ids),
    pending_refund_ids: ids(r.pending_refund_ids),
    pending_expense_ids: ids(r.pending_expense_ids),
    pending_payment_ids: ids(r.pending_payment_ids),
    payment_destination_ids: ids(r.payment_destination_ids),
    pending_payment_exception_ids: ids(r.pending_payment_exception_ids),
  };
}
export function decodeHandover(value: unknown, fundId: string): HolderHandover {
  const r = d.object(value);
  d.scope(d.uuid(r.fund_id), fundId);
  const status = d.enumeration(r.status, ['NOMINATED', 'ACCEPTED', 'COMPLETED', 'CANCELLED']);
  const snapshot = d.nullable(r.snapshot, decodeSnapshot);
  const oldHolder = d.uuid(r.old_holder_user_id),
    newHolder = d.uuid(r.new_holder_user_id);
  if (oldHolder === newHolder) throw Error('Invalid handover parties');
  if ((status === 'ACCEPTED' || status === 'COMPLETED') && !snapshot)
    throw Error('Missing handover snapshot');
  return {
    id: d.uuid(r.id),
    fund_id: fundId,
    old_holder_user_id: oldHolder,
    new_holder_user_id: newHolder,
    nominated_by_user_id: d.uuid(r.nominated_by_user_id),
    status,
    version: d.version(r.version),
    finance_version: d.version(r.finance_version),
    snapshot_finance_version: d.nullable(r.snapshot_finance_version, d.version),
    snapshot,
    snapshot_stale: d.boolean(r.snapshot_stale),
    accepted_at: d.nullable(r.accepted_at, d.instant),
    old_holder_confirmed_at: d.nullable(r.old_holder_confirmed_at, d.instant),
    new_holder_confirmed_at: d.nullable(r.new_holder_confirmed_at, d.instant),
    completed_at: d.nullable(r.completed_at, d.instant),
    cancelled_at: d.nullable(r.cancelled_at, d.instant),
    cancellation_reason: d.nullable(r.cancellation_reason, d.string),
    created_at: d.instant(r.created_at),
    updated_at: d.instant(r.updated_at),
  };
}
export function decodeHistory(value: unknown, fundId: string): FinanceHistory {
  const r = d.object(value);
  d.scope(d.uuid(r.fund_id), fundId);
  const action = d.string(r.action),
    entity = d.string(r.entity_type);
  if (!/^[A-Z][A-Z_]{0,59}$/.test(action) || !/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(entity))
    throw Error('Invalid history action');
  return {
    id: d.uuid(r.id),
    fund_id: fundId,
    actor_user_id: d.nullable(r.actor_user_id, d.uuid),
    system_actor: d.nullable(r.system_actor, (v) =>
      d.enumeration(v, [
        'MOMO_IPN',
        'MOMO_RECONCILIATION',
        'BANK_WEBHOOK:SEPAY',
        'PAYOS_WEBHOOK',
        'PAYOS_RECONCILIATION',
      ]),
    ),
    action,
    entity_type: entity,
    entity_id: d.nullable(r.entity_id, d.uuid),
    from_version: d.nullable(r.from_version, d.version),
    to_version: d.nullable(r.to_version, d.version),
    reason: d.nullable(r.reason, d.string),
    occurred_at: d.instant(r.occurred_at),
    correlation_id: d.uuid(r.correlation_id),
  };
}
export function decodeRefund(value: unknown, fundId: string): Refund {
  const r = d.object(value);
  d.scope(d.uuid(r.fund_id), fundId);
  return {
    id: d.uuid(r.id),
    fund_id: fundId,
    member_user_id: d.uuid(r.member_user_id),
    amount: d.money(r.amount, true),
    status: d.enumeration(r.status, [
      'PENDING',
      'HOLDER_REPORTED',
      'CONFIRMED',
      'CANCELLED',
      'REVERSED',
    ]),
    reason: d.string(r.reason),
    // Older Gateways omit the verification fields; absence means "not provided", never a guess.
    reversal_reason: r.reversal_reason == null ? null : d.string(r.reversal_reason),
    verifier_user_id: r.verifier_user_id == null ? null : d.uuid(r.verifier_user_id),
    verifier_assigned_by_user_id:
      r.verifier_assigned_by_user_id == null ? null : d.uuid(r.verifier_assigned_by_user_id),
    verifier_assigned_at: r.verifier_assigned_at == null ? null : d.instant(r.verifier_assigned_at),
    confirmed_by_user_id: r.confirmed_by_user_id == null ? null : d.uuid(r.confirmed_by_user_id),
    confirmation_mode:
      r.confirmation_mode == null
        ? null
        : d.enumeration(r.confirmation_mode, [
            'RECIPIENT',
            'OWNER',
            'ASSIGNED_MEMBER',
            'SELF_UNVERIFIED',
          ]),
    independent_verification:
      r.independent_verification == null ? null : d.boolean(r.independent_verification),
    holder_reported_at: d.nullable(r.holder_reported_at, d.instant),
    confirmed_at: d.nullable(r.confirmed_at, d.instant),
    nonreceipt_confirmed_at: d.nullable(r.nonreceipt_confirmed_at, d.instant),
    reversal_requested_at: d.nullable(r.reversal_requested_at, d.instant),
    reversal_consented_at: d.nullable(r.reversal_consented_at, d.instant),
    created_at: d.instant(r.created_at),
    updated_at: d.instant(r.updated_at),
    version: d.version(r.version),
    finance_version: d.version(r.finance_version),
  };
}
export function decodeFinancialNote(value: unknown, fundId: string): FinancialNote {
  const r = d.object(value);
  d.scope(d.uuid(r.fund_id), fundId);
  return {
    id: d.uuid(r.id),
    fund_id: fundId,
    description: d.string(r.description),
    amount: d.nullable(r.amount, d.money),
    payer_user_id: d.nullable(r.payer_user_id, d.uuid),
    created_by_user_id: d.uuid(r.created_by_user_id),
    created_at: d.instant(r.created_at),
    updated_at: d.instant(r.updated_at),
    version: d.version(r.version),
    finance_version: d.version(r.finance_version),
  };
}
export function decodeExpense(value: unknown, fundId: string): Expense {
  const r = d.object(value);
  d.scope(d.uuid(r.fund_id), fundId);
  return {
    id: d.uuid(r.id),
    fund_id: fundId,
    title: d.string(r.title),
    amount: d.money(r.amount, true),
    description: d.nullable(r.description, d.string),
    category: d.nullable(r.category, d.string),
    status: d.enumeration(r.status, ['DRAFT', 'SUBMITTED', 'CONFIRMED', 'REJECTED', 'REVERSED']),
    created_by_user_id: d.uuid(r.created_by_user_id),
    receipt_available: d.boolean(r.receipt_available),
    submitted_at: d.nullable(r.submitted_at, d.instant),
    paid_at: d.nullable(r.paid_at, d.instant),
    payment_method: d.nullable(r.payment_method, d.string),
    paid_by_user_id: d.nullable(r.paid_by_user_id, d.uuid),
    confirmed_at: d.nullable(r.confirmed_at, d.instant),
    confirmed_by_user_id: d.nullable(r.confirmed_by_user_id, d.uuid),
    rejected_reason: d.nullable(r.rejected_reason, d.string),
    created_at: d.instant(r.created_at),
    updated_at: d.instant(r.updated_at),
    version: d.version(r.version),
    finance_version: d.version(r.finance_version),
  };
}
