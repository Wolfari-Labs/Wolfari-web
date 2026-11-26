/**
 * MOMO_SANDBOX is a test wallet (no real money); PAYOS is a real-money VietQR checkout that pays
 * straight into the Holder's bank account. Each provider runs in exactly one environment.
 */
export type PaymentProvider = 'MOMO_SANDBOX' | 'PAYOS';
export interface PaymentAttempt {
  id: string;
  contribution_id: string;
  provider: PaymentProvider;
  environment: 'SANDBOX' | 'LIVE';
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
export const isTerminalPayment = (row: PaymentAttempt) =>
  row.status === 'SUCCEEDED' || row.status === 'FAILED' || row.status === 'EXPIRED';
const momoStatus: Record<PaymentAttempt['status'], string> = {
  CREATED: 'Đã tạo',
  PENDING: 'Đang chờ kết quả',
  SUCCEEDED: 'Thanh toán thành công',
  FAILED: 'Thanh toán thất bại',
  EXPIRED: 'Đã hết hạn',
};
// payOS success is written only by the signed webhook/reconciliation that books the money.
const payosStatus: Record<PaymentAttempt['status'], string> = {
  CREATED: 'Đang tạo link thanh toán payOS…',
  PENDING: 'Đang chờ thanh toán trên payOS',
  SUCCEEDED: 'Quỹ đã nhận tiền',
  FAILED: 'Thanh toán payOS không thành công',
  EXPIRED: 'Link thanh toán payOS đã hết hạn',
};
export const paymentStatusLabel = (row: Pick<PaymentAttempt, 'provider' | 'status'>) =>
  (row.provider === 'PAYOS' ? payosStatus : momoStatus)[row.status];
export const paymentLinkLabel = (provider: PaymentProvider) =>
  provider === 'PAYOS' ? 'Mở trang thanh toán payOS' : 'Mở MoMo Sandbox để thanh toán';
/** The hosted page may be opened only while the attempt is still open and its link has not expired. */
export const paymentLinkOpen = (row: PaymentAttempt, now = Date.now()) =>
  !!row.payment_url &&
  !isTerminalPayment(row) &&
  (!row.expires_at || Date.parse(row.expires_at) > now);
const errorMessages: Record<string, string> = {
  PAYOS_ACCOUNT_MISMATCH:
    'payOS không trả tiền vào đúng tài khoản nhận của khoản đóng nên link không được hiện. Hãy chuyển khoản bằng mã QR rồi báo đã chuyển.',
};
export const paymentErrorText = (code: string) => errorMessages[code] ?? 'Mã lỗi: ' + code;
