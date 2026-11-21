import type { Refund } from './runtime-fund';

/** The read contract does not expose the original payer after a Holder handover.
 * Never infer authority from the current Holder or an incompletely loaded roster.
 * These are candidates only; the server checks the original payer and membership.
 */
export function isRefundConfirmationCandidate(
  row: Pick<Refund, 'status' | 'member_user_id' | 'verifier_user_id'>,
  actor: string,
  owner: boolean,
) {
  return (
    row.status === 'HOLDER_REPORTED' &&
    (owner || row.member_user_id === actor || row.verifier_user_id === actor)
  );
}

export function canOfferRefundVerifier(
  row: Pick<Refund, 'status' | 'member_user_id'>,
  actor: string,
  owner: boolean,
) {
  return (
    owner &&
    row.member_user_id === actor &&
    (row.status === 'PENDING' || row.status === 'HOLDER_REPORTED')
  );
}
