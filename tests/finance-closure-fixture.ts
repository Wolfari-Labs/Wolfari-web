export const closureTrip = '11111111-1111-4111-8111-111111111111',
  closureFund = '77777777-1111-4111-8111-111111111111',
  closureId = '22222222-2222-4222-8222-222222222222';
export function closureFixture(actor: string) {
  return {
    id: closureId,
    fund_id: closureFund,
    requested_by_user_id: actor,
    status: 'PENDING_CONFIRMATIONS',
    snapshot_finance_version: 2,
    snapshot_schema_version: 1,
    snapshot_hash: 'a'.repeat(64),
    snapshot: {
      schema_version: 1,
      fund: {
        id: closureFund,
        trip_id: closureTrip,
        holder_user_id: actor,
        currency: 'VND',
        budget_amount: null,
        current_balance: '0',
        finance_version: 2,
      },
      required_user_ids: [actor],
      contribution_requests: [],
      contributions: [],
      expenses: [],
      financial_notes: [],
      refunds: [],
      ledger: [],
    },
    confirmations: [{ user_id: actor, confirmed_at: null as string | null }],
    requested_at: '2026-11-12T00:00:00Z',
    cancelled_at: null as string | null,
    cancelled_reason: null as string | null,
    closed_at: null as string | null,
    finance_version: 2,
  };
}
