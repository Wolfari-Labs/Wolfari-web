import type { Page } from '../../../infrastructure/http/decode';
import type { CommandCoordinator } from '../../../infrastructure/operations/command-coordinator';
export interface RuntimeFund {
  id: string;
  trip_id: string;
  holder_user_id: string;
  currency: 'VND';
  budget_amount: string | null;
  current_balance: string;
  reserved_refund: string;
  available_balance: string;
  status: 'OPEN' | 'CLOSING' | 'CLOSED';
  finance_version: number;
  closed_at: string | null;
}
export interface Destination {
  id: string;
  fund_id: string;
  destination_type: 'VIETQR' | 'MOMO_SANDBOX';
  is_default: boolean;
  active: boolean;
  version: number;
  confirmed_by_holder_at: string | null;
  bank_code?: string;
  account_number?: string;
  account_name?: string;
  momo_phone?: string;
}
export interface Contribution {
  id: string;
  fund_id: string;
  request_id: string;
  member_user_id: string;
  amount: string;
  status: 'PENDING' | 'TRANSFER_REPORTED' | 'CONFIRMED' | 'WAIVED' | 'CANCELLED' | 'REVERSED';
  self_contribution: boolean;
  version: number;
  finance_version: number;
  member_reported_at: string | null;
  confirmed_at: string | null;
  confirmed_by_user_id: string | null;
  waived_reason: string | null;
  cancelled_reason: string | null;
  rejected_reason: string | null;
}
export interface ContributionRequest {
  id: string;
  fund_id: string;
  title: string;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  version: number;
  finance_version: number;
  created_by_user_id: string;
  created_at: string;
  due_at: string | null;
  note: string | null;
  amount_per_member: string | null;
  closed_at: string | null;
  contributions: Contribution[];
}
export interface LedgerEntry {
  id: string;
  fund_id: string;
  sequence: string;
  direction: 'IN' | 'OUT';
  transaction_type: 'CONTRIBUTION' | 'EXPENSE' | 'REFUND' | 'REVERSAL';
  amount: string;
  balance_after: string;
  contribution_id: string | null;
  expense_id: string | null;
  refund_id: string | null;
  reversal_of_id: string | null;
  actor_user_id: string | null;
  reason: string | null;
  created_at: string;
}
export interface TransferInstruction {
  contribution_id: string;
  amount: string;
  currency: 'VND';
  reference: string;
  recipient_name: string;
  bank_code: string;
  bank_bin: string;
  account_number: string;
  environment: 'TEST';
  warning: string;
}
export interface FundRuntime {
  commands: CommandCoordinator;
  fund(tripId: string, signal?: AbortSignal): Promise<RuntimeFund | null>;
  destinations(fundId: string, signal?: AbortSignal): Promise<Destination[]>;
  requests(
    fundId: string,
    cursor?: string,
    signal?: AbortSignal,
    limit?: number,
  ): Promise<Page<ContributionRequest>>;
  contributions(
    fundId: string,
    cursor?: string,
    signal?: AbortSignal,
    limit?: number,
  ): Promise<Page<Contribution>>;
  ledger(
    fundId: string,
    cursor?: string,
    signal?: AbortSignal,
    limit?: number,
  ): Promise<Page<LedgerEntry>>;
  instruction(contributionId: string, signal?: AbortSignal): Promise<TransferInstruction>;
}
