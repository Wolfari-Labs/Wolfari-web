import * as d from '../http/decode';
import type { Closure } from '../../features/fund/model/runtime-fund';
const keys = {
  contribution_requests:
    'id title amount_per_member due_at status created_by_user_id created_at closed_at note version',
  contributions:
    'id request_id member_user_id amount status self_contribution member_reported_at confirmed_by_user_id confirmed_at waived_reason cancelled_reason waived_at cancelled_at reversed_at created_at updated_at version',
  expenses:
    'id title description amount status created_by_user_id submitted_at confirmed_at cancelled_at cancelled_reason category paid_at payment_method paid_by_user_id rejected_reason created_at updated_at version',
  financial_notes:
    'id payer_user_id amount description created_by_user_id version created_at updated_at',
  refunds:
    'id member_user_id amount status reason holder_reported_at confirmed_at nonreceipt_confirmed_at reversal_requested_at reversal_consented_at created_at updated_at version',
  ledger:
    'id sequence direction transaction_type amount balance_after contribution_id expense_id refund_id reversal_of_id actor_user_id reason created_at',
};
export function decodeClosure(value: unknown, fundId: string, tripId: string): Closure {
  const r = d.object(value),
    snapshot = d.object(r.snapshot),
    fund = d.object(snapshot.fund);
  d.scope(d.uuid(r.fund_id), fundId);
  d.scope(d.uuid(fund.id), fundId);
  d.scope(d.uuid(fund.trip_id), tripId);
  if (
    r.snapshot_schema_version !== 1 ||
    snapshot.schema_version !== 1 ||
    !/^[a-f0-9]{64}$/.test(d.string(r.snapshot_hash))
  )
    throw Error('Invalid snapshot schema/hash');
  const version = d.version(r.snapshot_finance_version);
  if (d.version(fund.finance_version) !== version) throw Error('Snapshot version mismatch');
  const required = d.list(snapshot.required_user_ids, d.uuid);
  const confirmations = d.list(r.confirmations, (v) => {
    const c = d.object(v);
    return { user_id: d.uuid(c.user_id), confirmed_at: d.nullable(c.confirmed_at, d.instant) };
  });
  if (
    new Set(required).size !== required.length ||
    required.length !== confirmations.length ||
    required.some((id, i) => confirmations[i]?.user_id !== id)
  )
    throw Error('Invalid confirmations');
  const records = Object.fromEntries(
    Object.entries(keys).map(([group, fields]) => [
      group,
      d.list(snapshot[group], (v) => {
        const row = d.object(v),
          names = fields.split(' ');
        if (Object.keys(row).length !== names.length || names.some((k) => !Object.hasOwn(row, k)))
          throw Error('Invalid snapshot row');
        const result: Record<string, string | number | boolean | null> = {};
        for (const key of names) {
          const item = row[key];
          if (
            item === null &&
            ![
              'id',
              'version',
              'status',
              'created_at',
              'updated_at',
              'self_contribution',
              'sequence',
              'direction',
              'transaction_type',
            ].includes(key)
          )
            result[key] = null;
          else if (key === 'id' || key.endsWith('_id')) result[key] = d.uuid(item);
          else if (key === 'version') result[key] = d.version(item);
          else if (key.endsWith('_at')) result[key] = d.instant(item);
          else if (['amount', 'amount_per_member', 'balance_after', 'sequence'].includes(key))
            result[key] = d.money(item);
          else if (key === 'self_contribution') result[key] = d.boolean(item);
          else result[key] = d.string(item);
        }
        return result;
      }),
    ]),
  );
  return {
    id: d.uuid(r.id),
    fund_id: fundId,
    requested_by_user_id: d.uuid(r.requested_by_user_id),
    status: d.enumeration(r.status, ['PENDING_CONFIRMATIONS', 'CANCELLED', 'COMPLETED']),
    snapshot_finance_version: version,
    snapshot_schema_version: 1,
    snapshot_hash: d.string(r.snapshot_hash),
    snapshot: {
      schema_version: 1,
      fund: {
        id: fundId,
        trip_id: tripId,
        holder_user_id: d.uuid(fund.holder_user_id),
        currency: d.enumeration(fund.currency, ['VND']),
        budget_amount: d.nullable(fund.budget_amount, d.money),
        current_balance: d.money(fund.current_balance),
        finance_version: version,
      },
      required_user_ids: required,
      records,
    },
    confirmations,
    requested_at: d.instant(r.requested_at),
    cancelled_at: d.nullable(r.cancelled_at, d.instant),
    cancelled_reason: d.nullable(r.cancelled_reason, d.string),
    closed_at: d.nullable(r.closed_at, d.instant),
    finance_version: d.version(r.finance_version),
  };
}
