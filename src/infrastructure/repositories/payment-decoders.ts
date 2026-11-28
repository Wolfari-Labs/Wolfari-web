import * as d from '../http/decode';
import type { PaymentAttempt, PaymentException } from '../../features/fund/model/payment';
/** Each provider runs in one environment and may only link to its own hosted payment page. */
const PROVIDERS = {
  MOMO_SANDBOX: { environment: 'SANDBOX', host: 'test-payment.momo.vn' },
  PAYOS: { environment: 'LIVE', host: 'pay.payos.vn' },
} as const;
export function decodePaymentAttempt(value: unknown): PaymentAttempt {
  const r = d.object(value);
  const provider = d.enumeration(r.provider, ['MOMO_SANDBOX', 'PAYOS']);
  const rule = PROVIDERS[provider];
  const environment = d.enumeration(r.environment, [rule.environment]);
  const payment_url = d.nullable(r.payment_url, d.string);
  if (payment_url) {
    const url = new URL(payment_url);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== rule.host ||
      url.port ||
      url.username ||
      url.password
    )
      throw Error('Invalid payment URL');
  }
  return {
    id: d.uuid(r.id),
    contribution_id: d.uuid(r.contribution_id),
    provider,
    environment,
    currency: d.enumeration(r.currency, ['VND']),
    amount: d.money(r.amount, true),
    status: d.enumeration(r.status, ['CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED']),
    needs_reconciliation: d.boolean(r.needs_reconciliation),
    payment_url,
    expires_at: d.nullable(r.expires_at, d.instant),
    error_code: d.nullable(r.error_code, d.string),
    created_at: d.instant(r.created_at),
    updated_at: d.instant(r.updated_at),
  };
}
export function decodePaymentException(value: unknown): PaymentException {
  const r = d.object(value);
  return {
    id: d.uuid(r.id),
    payment_attempt_id: d.nullable(r.payment_attempt_id, d.uuid),
    processing_status: d.enumeration(r.processing_status, ['NEEDS_REVIEW', 'PROCESSED', 'IGNORED']),
    review_reason: d.string(r.review_reason),
    received_at: d.instant(r.received_at),
    reviewed_at: d.nullable(r.reviewed_at, d.instant),
  };
}
