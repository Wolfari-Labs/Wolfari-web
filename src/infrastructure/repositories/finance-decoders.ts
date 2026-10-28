import * as d from '../http/decode';
import type { Contribution, ContributionRequest, Destination, LedgerEntry, RuntimeFund, TransferInstruction } from '../../features/fund/model/runtime-fund';
import type { Intent } from '../operations/command-coordinator';
export function decodeFund(value: unknown, tripId: string): RuntimeFund {
  const r = d.object(value); d.scope(d.uuid(r.trip_id), tripId);
  const balance = d.money(r.current_balance), reserved = d.money(r.reserved_refund), available = d.money(r.available_balance);
  if (BigInt(balance) - BigInt(reserved) !== BigInt(available)) throw Error('Invalid balance');
  return { id: d.uuid(r.id), trip_id: tripId, holder_user_id: d.uuid(r.holder_user_id), currency: d.enumeration(r.currency, ['VND']),
    budget_amount: d.nullable(r.budget_amount, d.money), current_balance: balance, reserved_refund: reserved, available_balance: available,
    status: d.enumeration(r.status, ['OPEN', 'CLOSING', 'CLOSED']), finance_version: d.version(r.finance_version), closed_at: d.nullable(r.closed_at, d.instant) };
}
export function decodeDestination(value: unknown, fundId: string): Destination {
  const r = d.object(value); d.scope(d.uuid(r.fund_id), fundId);
  const type = d.enumeration(r.destination_type, ['VIETQR', 'MOMO_SANDBOX']);
  const privateKeys = type === 'VIETQR' ? ['bank_code', 'account_number', 'account_name'] : ['momo_phone'];
  const present = privateKeys.filter(k => r[k] !== undefined);
  if (present.length !== 0 && present.length !== privateKeys.length) throw Error('Incomplete recipient');
  const recipient = Object.fromEntries(present.map(k => [k, d.string(r[k])]));
  return { id: d.uuid(r.id), fund_id: fundId, destination_type: type, is_default: d.boolean(r.is_default), active: d.boolean(r.active),
    version: d.version(r.version), confirmed_by_holder_at: d.nullable(r.confirmed_by_holder_at, d.instant), ...recipient };
}
export function decodeContribution(value: unknown, fundId: string): Contribution {
  const r = d.object(value); d.scope(d.uuid(r.fund_id), fundId);
  return { id: d.uuid(r.id), fund_id: fundId, request_id: d.uuid(r.request_id), member_user_id: d.uuid(r.member_user_id), amount: d.money(r.amount, true),
    status: d.enumeration(r.status, ['PENDING', 'TRANSFER_REPORTED', 'CONFIRMED', 'WAIVED', 'CANCELLED', 'REVERSED']), self_contribution: d.boolean(r.self_contribution),
    version: d.version(r.version), finance_version: d.version(r.finance_version), member_reported_at: d.nullable(r.member_reported_at, d.instant),
    confirmed_at: d.nullable(r.confirmed_at, d.instant), confirmed_by_user_id: d.nullable(r.confirmed_by_user_id, d.uuid),
    waived_reason: d.nullable(r.waived_reason, d.string), cancelled_reason: d.nullable(r.cancelled_reason, d.string), rejected_reason: d.nullable(r.rejected_reason, d.string) };
}
export function decodeRequest(value: unknown, fundId: string): ContributionRequest {
  const r = d.object(value); d.scope(d.uuid(r.fund_id), fundId);
  const id = d.uuid(r.id), fv = d.version(r.finance_version), contributions = d.list(r.contributions, v => decodeContribution(v, fundId));
  if (contributions.some(c => c.request_id !== id || c.finance_version !== fv) || new Set(contributions.map(c => c.member_user_id)).size !== contributions.length || new Set(contributions.map(c => c.id)).size !== contributions.length) throw Error('Invalid allocations');
  return { id, fund_id: fundId, title: d.string(r.title), status: d.enumeration(r.status, ['OPEN', 'CLOSED', 'CANCELLED']), version: d.version(r.version), finance_version: fv,
    created_by_user_id: d.uuid(r.created_by_user_id), created_at: d.instant(r.created_at), due_at: d.nullable(r.due_at, d.instant), note: d.nullable(r.note, d.string),
    closed_at: d.nullable(r.closed_at, d.instant), amount_per_member: d.nullable(r.amount_per_member, v => d.money(v, true)), contributions };
}
export function decodeLedger(value: unknown, fundId: string): LedgerEntry {
  const r = d.object(value); d.scope(d.uuid(r.fund_id), fundId);
  return { id: d.uuid(r.id), fund_id: fundId, sequence: d.money(r.sequence, true), direction: d.enumeration(r.direction, ['IN', 'OUT']),
    transaction_type: d.enumeration(r.transaction_type, ['CONTRIBUTION', 'EXPENSE', 'REFUND', 'REVERSAL']), amount: d.money(r.amount, true), balance_after: d.money(r.balance_after),
    contribution_id: d.nullable(r.contribution_id, d.uuid), expense_id: d.nullable(r.expense_id, d.uuid), refund_id: d.nullable(r.refund_id, d.uuid),
    reversal_of_id: d.nullable(r.reversal_of_id, d.uuid), actor_user_id: d.nullable(r.actor_user_id, d.uuid), reason: d.nullable(r.reason, d.string), created_at: d.instant(r.created_at) };
}
export function decodeInstruction(value: unknown, contributionId: string): TransferInstruction {
  const r = d.object(value); d.scope(d.uuid(r.contribution_id), contributionId);
  // Deliberately omit qr_url: no automatic request to any outside provider.
  return { contribution_id: contributionId, amount: d.money(r.amount, true), currency: d.enumeration(r.currency, ['VND']), environment: d.enumeration(r.environment, ['TEST']),
    reference: d.string(r.reference), recipient_name: d.string(r.recipient_name), bank_code: d.string(r.bank_code), bank_bin: d.string(r.bank_bin), account_number: d.string(r.account_number), warning: d.string(r.warning) };
}
export function decodeFinanceReceipt(value: unknown, intent: Intent) {
  if (intent.kind === 'enable' || intent.kind === 'budget') {
    const fund = decodeFund(value, intent.tripId); if (intent.fundId) d.scope(fund.id, intent.fundId); return fund;
  }
  const fundId = d.uuid(intent.fundId);
  const result = intent.kind.startsWith('destination-') ? decodeDestination(value, fundId)
    : intent.kind.startsWith('request-') ? decodeRequest(value, fundId) : decodeContribution(value, fundId);
  if (intent.resourceId) d.scope(result.id, intent.resourceId);
  return result;
}
