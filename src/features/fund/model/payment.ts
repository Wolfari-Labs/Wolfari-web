export interface PaymentAttempt {
  id: string;
  contribution_id: string;
  provider: 'MOMO_SANDBOX';
  environment: 'SANDBOX';
  currency: 'VND';
  amount: string;
  status: 'CREATED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';
  needs_reconciliation: boolean;
  payment_url: string | null;
  expires_at: string | null;
  error_code: string | null;
  created_at: string;
  updated_at: string;
}
export interface PaymentException {
  id: string;
  payment_attempt_id: string | null;
  processing_status: 'NEEDS_REVIEW' | 'PROCESSED' | 'IGNORED';
  review_reason: string;
  received_at: string;
  reviewed_at: string | null;
}
