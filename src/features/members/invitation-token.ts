// Secrets stay outside React Query and browser storage. Capture is an entry-point
// side effect, never a render/state-initializer side effect (including StrictMode).
let token: string | null = null;
let revision = 0;
export type InvitationResponseAttempt = {
  readonly token: string;
  readonly action: 'accept' | 'decline';
  readonly idempotencyKey: string;
};
let responseAttempt: InvitationResponseAttempt | null = null;
const listeners = new Set<() => void>();
function publish() {
  revision++;
  listeners.forEach((listener) => listener());
}
export const invitationToken = {
  read: () => token,
  revision: () => revision,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  clear: () => {
    const changed = token !== null || responseAttempt !== null;
    token = null;
    responseAttempt = null;
    if (changed) {
      publish();
    }
  },
};
export const invitationResponseAttempt = {
  read: (expectedToken: string) =>
    responseAttempt?.token === expectedToken ? responseAttempt : null,
  acquire: (attempt: InvitationResponseAttempt) => {
    if (!responseAttempt) responseAttempt = attempt;
    return responseAttempt.token === attempt.token ? responseAttempt : null;
  },
  isCurrent: (expectedToken: string, idempotencyKey: string) =>
    responseAttempt?.token === expectedToken && responseAttempt.idempotencyKey === idempotencyKey,
  settle: (expectedToken: string, idempotencyKey: string) => {
    if (
      responseAttempt?.token !== expectedToken ||
      responseAttempt.idempotencyKey !== idempotencyKey
    )
      return false;
    responseAttempt = null;
    return true;
  },
  clear: (expectedToken?: string) => {
    if (expectedToken === undefined || responseAttempt?.token === expectedToken)
      responseAttempt = null;
  },
};
export function captureInvitationToken() {
  if (!/^\/invitations(?:\/local)?\/?$/i.test(window.location.pathname) || !window.location.hash)
    return;
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const entries = [...fragment.entries()];
  const nextToken =
    entries.length === 1 &&
    entries[0]![0] === 'token' &&
    /^inv1_[A-Za-z0-9_-]{43}$/.test(entries[0]![1])
      ? entries[0]![1]
      : null;
  window.history.replaceState(
    window.history.state,
    '',
    window.location.pathname + window.location.search,
  );
  // Re-opening the same valid link must only scrub the URL. Publishing here
  // would remount the response flow and could replace an unresolved intent.
  if (nextToken !== null && nextToken === token) return;
  token = nextToken;
  responseAttempt = null;
  publish();
}
