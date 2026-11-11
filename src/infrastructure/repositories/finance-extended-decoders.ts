import * as d from '../http/decode';
import type { Expense } from '../../features/fund/model/runtime-fund';
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
