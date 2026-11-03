import { beforeEach, expect, it } from 'vitest';
import {
  decodePolicyIntent,
  loadPolicyIntent,
  persistPolicyIntent,
} from '../src/infrastructure/operations/policy-intent';
const actor = '11111111-1111-4111-8111-111111111111',
  trip = '22222222-2222-4222-8222-222222222222',
  key = '33333333-3333-4333-8333-333333333333';
beforeEach(() => sessionStorage.clear());
it('restores an immutable policy request only for its actor and Trip', () => {
  const intent = {
    key,
    policy: 'ALL_MEMBERS' as const,
    membershipRevision: 4,
    editorMemberIds: [],
  };
  persistPolicyIntent(actor, trip, intent, sessionStorage);
  expect(loadPolicyIntent(actor, trip, sessionStorage)).toEqual(intent);
  expect(loadPolicyIntent(key, trip, sessionStorage)).toBeNull();
  persistPolicyIntent(actor, trip, null, sessionStorage);
  expect(loadPolicyIntent(actor, trip, sessionStorage)).toBeNull();
});
it('rejects malformed/cross-actor journals and does not erase uncertain work', () => {
  const base = {
    actorId: actor,
    tripId: trip,
    key,
    policy: 'ALL_MEMBERS',
    membershipRevision: 4,
    editorMemberIds: [],
  };
  for (const patch of [
    { actorId: key },
    { key: 'bad' },
    { membershipRevision: 0 },
    { editorMemberIds: [key] },
    { password: 'not-allowed' },
  ]) {
    expect(() => decodePolicyIntent({ ...base, ...patch }, actor, trip)).toThrow();
  }
  const storageKey = `wolfari:policy-intent:v1:${actor}:${trip}`;
  sessionStorage.setItem(storageKey, '{');
  expect(() => loadPolicyIntent(actor, trip, sessionStorage)).toThrow();
  expect(sessionStorage.getItem(storageKey)).toBe('{');
});
