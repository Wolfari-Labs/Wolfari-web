import * as d from '../http/decode';
import type { BankTransfer, ClosureReadiness } from '../../features/fund/model/runtime-fund';

const reviewReasons = [
  'OUTGOING',
  'NO_REFERENCE',
  'UNKNOWN_REFERENCE',
  'MULTIPLE_REFERENCES',
  'ACCOUNT_MISMATCH',
  'AMOUNT_MISMATCH',
  'CONTRIBUTION_NOT_PAYABLE',
  'ALREADY_CONFIRMED',
  'FUND_NOT_OPEN',
  'VERSION_LIMIT',
] as const;

export function decodeBankTransfer(value: unknown, fundId: string): BankTransfer {
  const r = d.object(value);
  d.uuid(fundId);
  const processingStatus = d.enumeration(r.processing_status, [
    'MATCHED',
    'UNMATCHED',
    'NEEDS_REVIEW',
    'IGNORED',
    'RESOLVED',
  ]);
  const resolved = processingStatus === 'RESOLVED';
  const resolution = d.nullable(r.resolution, (v) =>
    d.enumeration(v, ['RETURNED_TO_SENDER', 'HANDLED_IN_APP', 'NOT_OURS']),
  );
  const resolutionNote = d.nullable(r.resolution_note, d.string);
  const resolvedBy = d.nullable(r.resolved_by_user_id, d.uuid);
  const resolvedAt = d.nullable(r.resolved_at, d.instant);
  if (
    d.enumeration(r.provider, ['SEPAY']) !== 'SEPAY' ||
    (r.transfer_type !== 'IN' && r.transfer_type !== 'OUT') ||
    resolved !== (resolution !== null && resolutionNote !== null && resolvedBy !== null && resolvedAt !== null) ||
    (!resolved && [resolution, resolutionNote, resolvedBy, resolvedAt].some((v) => v !== null))
  )
    throw Error('Invalid bank transfer');
  return {
    id: d.uuid(r.id),
    provider: 'SEPAY',
    provider_transaction_id: d.string(r.provider_transaction_id),
    transfer_type: r.transfer_type,
    amount: d.money(r.amount, true),
    content: d.string(r.content),
    account_number_masked: d.string(r.account_number_masked),
    bank_gateway: d.string(r.bank_gateway),
    processing_status: processingStatus,
    contribution_id: d.nullable(r.contribution_id, d.uuid),
    review_reason: d.nullable(r.review_reason, (v) =>
      d.enumeration(v, reviewReasons),
    ),
    transaction_at: d.nullable(r.transaction_at, d.instant),
    received_at: d.instant(r.received_at),
    processed_at: d.nullable(r.processed_at, d.instant),
    resolution,
    resolution_note: resolutionNote,
    resolved_by_user_id: resolvedBy,
    resolved_at: resolvedAt,
  };
}

const blockerKinds = [
  'BALANCE_NOT_ZERO',
  'CONTRIBUTIONS_OPEN',
  'EXPENSES_OPEN',
  'REFUNDS_OPEN',
  'PAYMENTS_OPEN',
  'PAYMENT_WEBHOOKS_OPEN',
  'BANK_TRANSFERS_REVIEW',
  'HOLDER_HANDOVER_OPEN',
] as const;

export function decodeClosureReadiness(value: unknown): ClosureReadiness {
  const r = d.object(value);
  const blockers = d.list(r.blockers, (raw) => {
    const blocker = d.object(raw);
    return {
      kind: d.enumeration(blocker.kind, blockerKinds),
      count: d.version(blocker.count),
    };
  });
  const readiness = {
    ready: d.boolean(r.ready),
    fund_status: d.enumeration(r.fund_status, ['OPEN', 'CLOSING', 'CLOSED']),
    current_balance: (() => {
      const amount = d.string(r.current_balance);
      if (!/^-?(0|[1-9]\d{0,18})$/.test(amount)) throw Error('Invalid balance');
      return amount;
    })(),
    blockers,
    bank_transfers_needing_review: (() => {
      if (
        !Number.isInteger(r.bank_transfers_needing_review) ||
        Number(r.bank_transfers_needing_review) < 0 ||
        Number(r.bank_transfers_needing_review) > 2147483647
      )
        throw Error('Invalid review count');
      return Number(r.bank_transfers_needing_review);
    })(),
  };
  const hasReviewBlocker = blockers.some((blocker) => blocker.kind === 'BANK_TRANSFERS_REVIEW');
  if (
    readiness.ready !== (readiness.fund_status === 'OPEN' && blockers.length === 0) ||
    hasReviewBlocker !== (readiness.bank_transfers_needing_review > 0)
  )
    throw Error('Inconsistent closure readiness');
  return readiness;
}
