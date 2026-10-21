import type { ReadResult } from '../../../shared/types/result';

/**
 * Money is deliberately represented as a decimal integer string. Finance has
 * not exposed a Web DTO yet, so keeping this boundary string-only prevents a
 * browser number from silently rounding a VND amount.
 */
export type MoneyVnd = string;

export const fundScenarios = [
  'success',
  'read-only',
  'closing',
  'closed',
  'loading',
  'empty',
  'error',
  'forbidden',
  'not-found',
  'conflict',
  'unavailable',
] as const;
export type FundScenario = (typeof fundScenarios)[number];

export const fundStatuses = ['OPEN', 'CLOSING', 'CLOSED'] as const;
export type FundStatus = (typeof fundStatuses)[number];
export type FundViewerRole = 'MEMBER' | 'OWNER' | 'HOLDER';

export const contributionStatuses = [
  'PENDING',
  'TRANSFER_REPORTED',
  'CONFIRMED',
  'WAIVED',
  'CANCELLED',
  'REVERSED',
] as const;
export type ContributionStatus = (typeof contributionStatuses)[number];

export const expenseStatuses = ['DRAFT', 'SUBMITTED', 'CONFIRMED', 'REJECTED', 'REVERSED'] as const;
export type ExpenseStatus = (typeof expenseStatuses)[number];

export const refundStatuses = ['PENDING', 'HOLDER_REPORTED', 'CONFIRMED', 'CANCELLED', 'REVERSED'] as const;
export type RefundStatus = (typeof refundStatuses)[number];

export const closureStatuses = [
  'PENDING_CONFIRMATIONS',
  'COMPLETED',
  'CANCELLED',
] as const;
export type ClosureStatus = (typeof closureStatuses)[number];

export type LedgerDirection = 'IN' | 'OUT';
export type LedgerTransactionType =
  | 'CONTRIBUTION'
  | 'EXPENSE'
  | 'REFUND'
  | 'REVERSAL';

export interface FundProjection {
  readonly id: string;
  readonly tripId: string;
  readonly holderUserId: string;
  readonly currency: 'VND';
  readonly budgetAmount: MoneyVnd | null;
  /** Confirmed ledger balance, before subtracting reservations. */
  readonly currentBalance: MoneyVnd;
  /** Confirmed refunds which are reserved but not yet settled. */
  readonly reservedRefund: MoneyVnd;
  /** currentBalance - reservedRefund. */
  readonly availableBalance: MoneyVnd;
  readonly status: FundStatus;
  readonly closedAt: string | null;
  readonly financeVersion: number;
}

export interface FundTotals {
  readonly confirmedContributions: MoneyVnd;
  readonly confirmedExpenses: MoneyVnd;
  readonly confirmedRefunds: MoneyVnd;
  readonly ledgerBalance: MoneyVnd;
  readonly reservedRefund: MoneyVnd;
  readonly availableBalance: MoneyVnd;
}

export interface FundMemberPresentation {
  /** Nullable because Finance does not own Identity enrichment. */
  readonly displayName: string | null;
  readonly avatar: { readonly src: string; readonly alt: string } | null;
}

export interface FundContributionViewModel {
  readonly id: string;
  readonly fundId: string;
  readonly requestId: string;
  readonly memberUserId: string;
  readonly amount: MoneyVnd;
  readonly status: ContributionStatus;
  readonly selfContribution: boolean;
  readonly version: number;
  readonly presentation: FundMemberPresentation;
}

export interface FundExpenseViewModel {
  readonly id: string;
  readonly fundId: string;
  readonly title: string;
  readonly description: string | null;
  readonly amount: MoneyVnd;
  readonly status: ExpenseStatus;
  readonly category: string | null;
  readonly paidAt: string | null;
  readonly createdByUserId: string;
  readonly paidByUserId: string | null;
  readonly version: number;
  readonly presentation: FundMemberPresentation;
}

export interface FundNoteViewModel {
  readonly id: string;
  readonly fundId: string;
  readonly description: string;
  readonly amount: MoneyVnd | null;
  readonly payerUserId: string | null;
  readonly version: number;
  readonly presentation: FundMemberPresentation;
}

export interface FundRefundViewModel {
  readonly id: string;
  readonly fundId: string;
  readonly memberUserId: string;
  readonly amount: MoneyVnd;
  readonly status: RefundStatus;
  readonly reason: string | null;
  readonly version: number;
  readonly presentation: FundMemberPresentation;
}

export interface FundLedgerEntryViewModel {
  readonly id: string;
  readonly fundId: string;
  /** Decimal string from the append-only Finance ledger. */
  readonly sequence: string;
  readonly direction: LedgerDirection;
  readonly transactionType: LedgerTransactionType;
  readonly amount: MoneyVnd;
  readonly balanceAfter: MoneyVnd;
  readonly contributionId: string | null;
  readonly expenseId: string | null;
  readonly refundId: string | null;
  readonly reversalOfId: string | null;
  readonly actorUserId: string | null;
  readonly reason: string | null;
  readonly createdAt: string;
  readonly presentation: {
    readonly title: string;
    readonly actor: FundMemberPresentation;
  };
}

export interface FundClosureBlocker {
  readonly code:
    | 'NON_ZERO_BALANCE'
    | 'RESERVED_REFUND'
    | 'PENDING_CONTRIBUTIONS'
    | 'TRANSFER_REPORTED'
    | 'PENDING_PAYMENT'
    | 'SUBMITTED_EXPENSES'
    | 'PENDING_REFUNDS'
    | 'PENDING_CONFIRMATIONS';
  readonly label: string;
  readonly amount: MoneyVnd | null;
}

export interface FundClosureViewModel {
  readonly id: string;
  readonly fundId: string;
  readonly status: ClosureStatus;
  readonly snapshotHash: string;
  readonly requiredUserIds: readonly string[];
  readonly confirmedUserIds: readonly string[];
  readonly blockers: readonly FundClosureBlocker[];
  readonly closedAt: string | null;
  readonly financeVersion: number;
}

/**
 * These flags are read projections. They do not grant a command from the Web;
 * all command methods remain intentionally absent from FundRepository.
 */
export interface FundPermissions {
  readonly canRead: boolean;
  readonly canConfigure: boolean;
  readonly canCreateContributionRequest: boolean;
  readonly canReportTransfer: boolean;
  readonly canConfirmContribution: boolean;
  readonly canCreateExpense: boolean;
  readonly canEditOwnExpenseDraft: boolean;
  readonly canEditAnyExpenseDraft: boolean;
  readonly canConfirmExpense: boolean;
  readonly canCreateOutsideFundNote: boolean;
  readonly canCreateRefund: boolean;
  readonly canBeginClosure: boolean;
  readonly canCancelClosure: boolean;
  readonly canConfirmClosure: boolean;
}

export interface FundViewModel {
  readonly tripId: string;
  readonly environment: 'TEST' | 'SANDBOX';
  readonly viewerRole: FundViewerRole;
  readonly fund: FundProjection;
  readonly totals: FundTotals;
  readonly contributions: readonly FundContributionViewModel[];
  readonly expenses: readonly FundExpenseViewModel[];
  readonly notes: readonly FundNoteViewModel[];
  readonly refunds: readonly FundRefundViewModel[];
  readonly ledger: readonly FundLedgerEntryViewModel[];
  /** Cursor for the next ledger page; null means the fixture is complete. */
  readonly nextCursor: string | null;
  readonly closure: FundClosureViewModel | null;
  readonly permissions: FundPermissions;
  readonly blockers: readonly FundClosureBlocker[];
}

export interface FundRepository {
  getFund(request: {
    readonly tripId: string;
    readonly scenario: FundScenario;
    readonly signal: AbortSignal;
  }): Promise<ReadResult<FundViewModel>>;
}

/** Runtime guard for form adapters before a future command contract exists. */
export function isMoneyVnd(value: string): value is MoneyVnd {
  return /^(?:0|[1-9]\d*)$/.test(value.trim());
}

export function addMoneyVnd(values: readonly MoneyVnd[]): MoneyVnd {
  return values.reduce((total, value) => total + BigInt(value), 0n).toString();
}
