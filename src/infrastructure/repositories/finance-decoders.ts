import * as d from '../http/decode';
import { decodePaymentAttempt, decodePaymentException } from './payment-decoders';
import { decodeClosure } from './finance-closure-decoder';
import type {
  Bank,
  Contribution,
  ContributionRequest,
  Destination,
  LedgerEntry,
  RuntimeFund,
  TransferInstruction,
} from '../../features/fund/model/runtime-fund';
import { decodeBankTransfer } from './finance-operations-decoders';
import type { Intent } from '../operations/command-coordinator';
import { decodeOperation } from '../operations/command-coordinator';
import {
  decodeExpense,
  decodeFinancialNote,
  decodeHandover,
  decodeRefund,
} from './finance-extended-decoders';
export function decodeFund(value: unknown, tripId: string): RuntimeFund {
  const r = d.object(value);
  d.scope(d.uuid(r.trip_id), tripId);
  const balance = d.money(r.current_balance),
    reserved = d.money(r.reserved_refund),
    available = d.money(r.available_balance);
  if (BigInt(balance) - BigInt(reserved) !== BigInt(available)) throw Error('Invalid balance');
  return {
    id: d.uuid(r.id),
    trip_id: tripId,
    holder_user_id: d.uuid(r.holder_user_id),
    currency: d.enumeration(r.currency, ['VND']),
    budget_amount: d.nullable(r.budget_amount, d.money),
    current_balance: balance,
    reserved_refund: reserved,
    available_balance: available,
    status: d.enumeration(r.status, ['OPEN', 'CLOSING', 'CLOSED']),
    finance_version: d.version(r.finance_version),
    closed_at: d.nullable(r.closed_at, d.instant),
  };
}
export function decodeDestination(value: unknown, fundId: string): Destination {
  const r = d.object(value);
  d.scope(d.uuid(r.fund_id), fundId);
  const type = d.enumeration(r.destination_type, ['VIETQR', 'MOMO_SANDBOX']);
  const privateKeys =
    type === 'VIETQR' ? ['bank_code', 'account_number', 'account_name'] : ['momo_phone'];
  const present = privateKeys.filter((k) => r[k] !== undefined);
  if (present.length !== 0 && present.length !== privateKeys.length)
    throw Error('Incomplete recipient');
  const recipient = Object.fromEntries(present.map((k) => [k, d.string(r[k])]));
  return {
    id: d.uuid(r.id),
    fund_id: fundId,
    destination_type: type,
    is_default: d.boolean(r.is_default),
    active: d.boolean(r.active),
    version: d.version(r.version),
    confirmed_by_holder_at: d.nullable(r.confirmed_by_holder_at, d.instant),
    ...recipient,
  };
}
export function decodeContribution(value: unknown, fundId: string): Contribution {
  const r = d.object(value);
  d.scope(d.uuid(r.fund_id), fundId);
  return {
    id: d.uuid(r.id),
    fund_id: fundId,
    request_id: d.uuid(r.request_id),
    member_user_id: d.uuid(r.member_user_id),
    amount: d.money(r.amount, true),
    status: d.enumeration(r.status, [
      'PENDING',
      'TRANSFER_REPORTED',
      'CONFIRMED',
      'WAIVED',
      'CANCELLED',
      'REVERSED',
    ]),
    self_contribution: d.boolean(r.self_contribution),
    version: d.version(r.version),
    finance_version: d.version(r.finance_version),
    member_reported_at: d.nullable(r.member_reported_at, d.instant),
    confirmed_at: d.nullable(r.confirmed_at, d.instant),
    confirmed_by_user_id: d.nullable(r.confirmed_by_user_id, d.uuid),
    waived_reason: d.nullable(r.waived_reason, d.string),
    cancelled_reason: d.nullable(r.cancelled_reason, d.string),
    rejected_reason: d.nullable(r.rejected_reason, d.string),
  };
}
export function decodeRequest(value: unknown, fundId: string): ContributionRequest {
  const r = d.object(value);
  d.scope(d.uuid(r.fund_id), fundId);
  const id = d.uuid(r.id),
    fv = d.version(r.finance_version),
    contributions = d.list(r.contributions, (v) => decodeContribution(v, fundId));
  if (
    contributions.some((c) => c.request_id !== id || c.finance_version !== fv) ||
    new Set(contributions.map((c) => c.member_user_id)).size !== contributions.length ||
    new Set(contributions.map((c) => c.id)).size !== contributions.length
  )
    throw Error('Invalid allocations');
  return {
    id,
    fund_id: fundId,
    title: d.string(r.title),
    status: d.enumeration(r.status, ['OPEN', 'CLOSED', 'CANCELLED']),
    version: d.version(r.version),
    finance_version: fv,
    created_by_user_id: d.uuid(r.created_by_user_id),
    created_at: d.instant(r.created_at),
    due_at: d.nullable(r.due_at, d.instant),
    note: d.nullable(r.note, d.string),
    closed_at: d.nullable(r.closed_at, d.instant),
    amount_per_member: d.nullable(r.amount_per_member, (v) => d.money(v, true)),
    contributions,
  };
}
export function decodeLedger(value: unknown, fundId: string): LedgerEntry {
  const r = d.object(value);
  d.scope(d.uuid(r.fund_id), fundId);
  return {
    id: d.uuid(r.id),
    fund_id: fundId,
    sequence: d.money(r.sequence, true),
    direction: d.enumeration(r.direction, ['IN', 'OUT']),
    transaction_type: d.enumeration(r.transaction_type, [
      'CONTRIBUTION',
      'EXPENSE',
      'REFUND',
      'REVERSAL',
    ]),
    amount: d.money(r.amount, true),
    balance_after: d.money(r.balance_after),
    contribution_id: d.nullable(r.contribution_id, d.uuid),
    expense_id: d.nullable(r.expense_id, d.uuid),
    refund_id: d.nullable(r.refund_id, d.uuid),
    reversal_of_id: d.nullable(r.reversal_of_id, d.uuid),
    actor_user_id: d.nullable(r.actor_user_id, d.uuid),
    reason: d.nullable(r.reason, d.string),
    created_at: d.instant(r.created_at),
  };
}
// Plain QR SVG as Finance renders it: one background rect and one path, nothing else.
const QR_SVG =
  /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 \d+ \d+" shape-rendering="crispEdges" role="img" aria-label="[A-Za-z0-9 ]*"><rect width="\d+" height="\d+" fill="#ffffff"\/><path d="(?:M\d+ \d+h\d+v1h-\d+z)+" fill="#000000"\/><\/svg>$/;
const tlv = (id: string, value: string) => id + String(value.length).padStart(2, '0') + value;
/** CRC-16/CCITT-FALSE as required by EMVCo/NAPAS for tag 63. */
export function vietQrCrc(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
export function decodeInstruction(value: unknown, contributionId: string): TransferInstruction {
  const r = d.object(value);
  d.scope(d.uuid(r.contribution_id), contributionId);
  const amount = d.money(r.amount, true),
    reference = d.string(r.reference),
    bank_bin = d.string(r.bank_bin),
    account_number = d.string(r.account_number),
    qr_payload = d.string(r.qr_payload),
    qr_svg = d.string(r.qr_svg);
  // Never show a code that could pay someone else: the NAPAS payload must carry exactly the
  // printed bank, account, amount and transfer content, with a valid CRC. qr_url is ignored.
  if (
    !/^000201[\x20-\x7e]{20,500}6304[0-9A-F]{4}$/.test(qr_payload) ||
    qr_payload.slice(-4) !== vietQrCrc(qr_payload.slice(0, -4)) ||
    !qr_payload.includes(tlv('00', bank_bin) + tlv('01', account_number)) ||
    !qr_payload.includes(tlv('54', amount)) ||
    !qr_payload.includes(tlv('08', reference))
  )
    throw Error('Invalid QR payload');
  if (qr_svg.length > 65536 || !QR_SVG.test(qr_svg)) throw Error('Invalid QR image');
  return {
    contribution_id: contributionId,
    amount,
    currency: d.enumeration(r.currency, ['VND']),
    environment: d.enumeration(r.environment, ['LIVE']),
    reference,
    recipient_name: d.string(r.recipient_name),
    bank_code: d.string(r.bank_code),
    bank_bin,
    bank_name: d.string(r.bank_name),
    account_number,
    qr_payload,
    qr_svg,
    warning: d.string(r.warning),
    online_payment_providers: decodeOnlineProviders(r.online_payment_providers),
  };
}
/**
 * Checkouts that pay into this exact destination. Absent (older server) means none. The list
 * must be unique strings; a provider this Web build does not know is never offered.
 */
function decodeOnlineProviders(value: unknown): 'PAYOS'[] {
  if (value === undefined) return [];
  const names = d.list(value, d.string);
  if (new Set(names).size !== names.length) throw Error('Invalid online payment providers');
  return names.filter((name): name is 'PAYOS' => name === 'PAYOS');
}
export function decodeBank(value: unknown): Bank {
  const r = d.object(value),
    bin = d.string(r.bin);
  if (!/^[0-9]{6}$/.test(bin)) throw Error('Invalid BIN');
  return {
    code: d.string(r.code),
    bin,
    name: d.string(r.name),
    short_name: d.string(r.short_name),
  };
}
export function decodeFinanceReceipt(value: unknown, intent: Intent) {
  if (intent.kind === 'bank-transfer-resolve') {
    const row = decodeBankTransfer(value, d.uuid(intent.fundId));
    d.scope(row.id, d.uuid(intent.resourceId));
    if (row.processing_status !== 'RESOLVED' || row.resolution !== intent.body?.resolution)
      throw Error('Invalid bank transfer receipt');
    return row;
  }
  if (intent.kind === 'payment-create' || intent.kind === 'payment-reconcile') {
    const row = decodePaymentAttempt(value);
    d.scope(
      intent.kind === 'payment-create' ? row.contribution_id : row.id,
      d.uuid(intent.resourceId),
    );
    // A real-money payOS request must never be satisfied by a Sandbox attempt, or vice versa.
    if (
      intent.kind === 'payment-create' &&
      intent.body?.provider !== undefined &&
      row.provider !== intent.body.provider
    )
      throw Error('Payment provider mismatch');
    return row;
  }
  if (intent.kind === 'payment-resolve') {
    const row = decodePaymentException(value);
    d.scope(row.id, d.uuid(intent.resourceId));
    return row;
  }
  if (intent.kind.startsWith('handover-')) {
    const row = decodeHandover(value, d.uuid(intent.fundId));
    if (intent.resourceId) d.scope(row.id, intent.resourceId);
    if (intent.kind === 'handover-create') {
      if (row.new_holder_user_id !== intent.body?.new_holder_user_id || row.status !== 'NOMINATED')
        throw Error('Invalid handover receipt');
    } else if (row.version <= (intent.versions.expected_version ?? 0))
      throw Error('Stale handover receipt');
    return row;
  }
  if (intent.kind.startsWith('closure-')) {
    const row = decodeClosure(value, d.uuid(intent.fundId), intent.tripId);
    if (intent.resourceId) d.scope(row.id, intent.resourceId);
    if (intent.kind === 'closure-confirm' && row.snapshot_hash !== intent.body?.snapshot_hash)
      throw Error('Snapshot changed');
    return row;
  }
  if (intent.kind.startsWith('refund-')) {
    const row = decodeRefund(value, d.uuid(intent.fundId));
    if (intent.resourceId) d.scope(row.id, intent.resourceId);
    if (
      row.finance_version <= (intent.versions.expected_finance_version ?? 0) ||
      row.version <= (intent.versions.expected_version ?? 0)
    )
      throw Error('Stale refund receipt');
    return row;
  }
  if (intent.kind === 'contribution-reverse') {
    const row = decodeContribution(value, d.uuid(intent.fundId));
    d.scope(row.id, d.uuid(intent.resourceId));
    if (
      row.status !== 'REVERSED' ||
      row.version <= (intent.versions.expected_version ?? 0) ||
      row.finance_version <= (intent.versions.expected_finance_version ?? 0)
    )
      throw Error('Invalid reversal receipt');
    return row;
  }
  if (intent.kind === 'expense-delete' || intent.kind === 'note-delete') {
    const operation = decodeOperation(value, intent);
    if (operation.state !== 'SUCCEEDED') throw Error('Unconfirmed delete');
    return operation;
  }
  if (intent.kind.startsWith('note-')) {
    const note = decodeFinancialNote(value, d.uuid(intent.fundId));
    if (intent.resourceId) d.scope(note.id, intent.resourceId);
    if (note.finance_version < (intent.versions.expected_finance_version ?? 0))
      throw Error('Stale note');
    return note;
  }
  if (intent.kind.startsWith('expense-')) {
    const expense = decodeExpense(value, d.uuid(intent.fundId));
    if (intent.resourceId) d.scope(expense.id, intent.resourceId);
    if (
      expense.finance_version < (intent.versions.expected_finance_version ?? 0) ||
      (intent.kind !== 'expense-edit' &&
        expense.finance_version === intent.versions.expected_finance_version)
    )
      throw Error('Stale expense receipt');
    return expense;
  }
  if (intent.kind === 'enable' || intent.kind === 'budget') {
    const fund = decodeFund(value, intent.tripId);
    if (intent.fundId) d.scope(fund.id, intent.fundId);
    return fund;
  }
  const fundId = d.uuid(intent.fundId);
  const result = intent.kind.startsWith('destination-')
    ? decodeDestination(value, fundId)
    : intent.kind.startsWith('request-')
      ? decodeRequest(value, fundId)
      : decodeContribution(value, fundId);
  if (intent.resourceId) d.scope(result.id, intent.resourceId);
  return result;
}
