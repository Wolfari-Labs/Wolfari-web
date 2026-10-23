import type { InvitationCreateIntent, InvitationVersionIntent } from './model/members';

export type InvitationManagementAttempt =
  | { readonly action: 'create'; readonly intent: InvitationCreateIntent }
  | {
      readonly action: 'resend' | 'revoke';
      readonly id: string;
      readonly intent: InvitationVersionIntent;
    };

type RetainedAttempt = {
  readonly scope: string;
  readonly attempt: InvitationManagementAttempt;
};

// Only the current Owner scope is retained. Entering another trip or account
// discards the previous scope, while a same-scope route remount can safely retry.
let retained: RetainedAttempt | null = null;

function keyOf(attempt: InvitationManagementAttempt) {
  return attempt.intent.idempotencyKey;
}

export const invitationManagementAttempt = {
  read(scope: string) {
    return retained?.scope === scope ? retained.attempt : null;
  },
  enter(scope: string) {
    if (retained && retained.scope !== scope) retained = null;
  },
  acquire(scope: string, attempt: InvitationManagementAttempt) {
    if (!retained || retained.scope !== scope) retained = { scope, attempt };
    return retained.attempt;
  },
  isCurrent(scope: string, idempotencyKey: string) {
    return retained?.scope === scope && keyOf(retained.attempt) === idempotencyKey;
  },
  settle(scope: string, idempotencyKey: string) {
    if (retained?.scope !== scope || keyOf(retained.attempt) !== idempotencyKey) return false;
    retained = null;
    return true;
  },
  clear(scope?: string) {
    if (scope === undefined || retained?.scope === scope) retained = null;
  },
};
