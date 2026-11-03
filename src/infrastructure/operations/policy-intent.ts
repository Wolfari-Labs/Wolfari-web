import type { PlanPolicySnapshot } from '../../features/trips/repositories/trip.repository';
import * as d from '../http/decode';

export type PolicyIntent = PlanPolicySnapshot & { key: string };
const storageKey = (actorId: string, tripId: string) =>
  `wolfari:policy-intent:v1:${actorId}:${tripId}`;
export function decodePolicyIntent(value: unknown, actorId: string, tripId: string): PolicyIntent {
  const r = d.object(value);
  if (
    Object.keys(r).some(
      (k) =>
        !['actorId', 'tripId', 'key', 'policy', 'membershipRevision', 'editorMemberIds'].includes(
          k,
        ),
    )
  )
    throw Error('Invalid policy journal');
  d.scope(d.uuid(r.actorId), actorId);
  d.scope(d.uuid(r.tripId), tripId);
  const policy = d.enumeration(r.policy, ['OWNER_ONLY', 'ALL_MEMBERS', 'SELECTED_MEMBERS']);
  const editorMemberIds = d.list(r.editorMemberIds, d.uuid);
  if (
    new Set(editorMemberIds).size !== editorMemberIds.length ||
    (policy !== 'SELECTED_MEMBERS' && editorMemberIds.length)
  )
    throw Error('Invalid assignments');
  return {
    key: d.uuid(r.key),
    policy,
    editorMemberIds,
    membershipRevision: d.version(r.membershipRevision),
  };
}
export function loadPolicyIntent(actorId: string, tripId: string, storage: Storage) {
  const raw = storage.getItem(storageKey(actorId, tripId));
  if (raw === null) return null;
  if (raw.length > 150000) throw Error('Invalid policy journal');
  return decodePolicyIntent(JSON.parse(raw), actorId, tripId);
}
export function persistPolicyIntent(
  actorId: string,
  tripId: string,
  intent: PolicyIntent | null,
  storage: Storage,
) {
  if (intent === null) {
    storage.removeItem(storageKey(actorId, tripId));
    return;
  }
  const safe = decodePolicyIntent({ actorId, tripId, ...intent }, actorId, tripId);
  storage.setItem(storageKey(actorId, tripId), JSON.stringify({ actorId, tripId, ...safe }));
}
