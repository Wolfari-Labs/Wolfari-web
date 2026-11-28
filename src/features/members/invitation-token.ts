import { browserStorage } from '../../shared/lib/browser-storage';
import { invitationTokenPattern, isJoinCode, normalizeJoinCode } from './model/members';

// The pending invitation secret (an `inv1_` link token or a normalized 8-character join code)
// stays outside React Query. It is kept in sessionStorage for a short time only, so it survives
// login → register → email verification → login in this tab, and is removed once answered.
// Capture is an entry-point side effect, never a render/state-initializer side effect
// (including StrictMode).
const STORAGE_KEY = 'wolfari.invitation.pending.v1';
export const PENDING_INVITATION_TTL_MS = 30 * 60_000;
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
const validSecret = (value: unknown): value is string =>
  typeof value === 'string' && (invitationTokenPattern.test(value) || isJoinCode(value));
function persist(value: string | null) {
  const storage = browserStorage('sessionStorage');
  try {
    if (value === null) storage?.removeItem(STORAGE_KEY);
    else
      storage?.setItem(
        STORAGE_KEY,
        JSON.stringify({ secret: value, expires_at: Date.now() + PENDING_INVITATION_TTL_MS }),
      );
  } catch {
    // Storage blocked: the secret stays in memory for this page only.
  }
}
function restore(): string | null {
  const storage = browserStorage('sessionStorage');
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { secret?: unknown; expires_at?: unknown } | null;
    const now = Date.now();
    if (
      saved &&
      validSecret(saved.secret) &&
      typeof saved.expires_at === 'number' &&
      saved.expires_at > now &&
      saved.expires_at <= now + PENDING_INVITATION_TTL_MS
    )
      return saved.secret;
    storage?.removeItem(STORAGE_KEY);
  } catch {
    try {
      storage?.removeItem(STORAGE_KEY);
    } catch {
      // Nothing else to do; an unreadable entry is never used.
    }
  }
  return null;
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
  /** Opens the invitation for a typed join code (already normalized). */
  open: (secret: string) => {
    if (!validSecret(secret)) return;
    persist(secret);
    if (secret === token) return;
    token = secret;
    responseAttempt = null;
    publish();
  },
  clear: () => {
    const changed = token !== null || responseAttempt !== null;
    token = null;
    responseAttempt = null;
    persist(null);
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
  if (!/^\/invitations(?:\/local)?\/?$/i.test(window.location.pathname) || !window.location.hash) {
    // A reload (or a new page in this tab) resumes a pending invitation that has not expired.
    if (token === null) {
      const saved = restore();
      if (saved !== null) {
        token = saved;
        responseAttempt = null;
        publish();
      }
    }
    return;
  }
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const entries = [...fragment.entries()];
  const [name, value] = entries.length === 1 ? entries[0]! : ['', ''];
  // `#token=inv1_…` (emailed link) or `#code=XXXX-XXXX` (share link); nothing else is accepted.
  const nextToken =
    name === 'token' && invitationTokenPattern.test(value)
      ? value
      : name === 'code'
        ? (normalizeJoinCode(value) ?? null)
        : null;
  window.history.replaceState(
    window.history.state,
    '',
    window.location.pathname + window.location.search,
  );
  persist(nextToken);
  // Re-opening the same valid link must only scrub the URL. Publishing here
  // would remount the response flow and could replace an unresolved intent.
  if (nextToken !== null && nextToken === token) return;
  token = nextToken;
  responseAttempt = null;
  publish();
}
