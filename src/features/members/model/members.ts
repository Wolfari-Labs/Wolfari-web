import type { ReadResult } from '../../../shared/types/result';
export const membershipScenarios = [
  'success',
  'loading',
  'empty',
  'error',
  'forbidden',
  'not-found',
  'conflict',
  'unavailable',
] as const;
export type MembershipScenario = (typeof membershipScenarios)[number];
export type MembershipReadRequest = {
  readonly tripId: string;
  readonly scenario: MembershipScenario;
  readonly signal: AbortSignal;
  readonly cursor?: string;
  readonly limit?: number;
  readonly includeLeft?: boolean;
};
export interface MembershipViewModel {
  readonly id: string;
  readonly tripId: string;
  readonly userId: string;
  readonly role: 'OWNER' | 'MEMBER';
  readonly joinedAt: string;
  readonly leftAt: string | null;
  readonly presentation: {
    readonly displayName: string | null;
    readonly avatar: { readonly src: string; readonly alt: string } | null;
  };
}
export interface MembershipPageViewModel {
  readonly items: readonly MembershipViewModel[];
  readonly nextCursor: string | null;
}
export interface MembershipRepository {
  readonly commands?: import('../../../infrastructure/operations/command-coordinator').CommandCoordinator;
  listMembers(request: MembershipReadRequest): Promise<ReadResult<MembershipPageViewModel>>;
}
export const invitationScenarios = [...membershipScenarios, 'expired', 'revoked', 'used'] as const;
export type InvitationScenario = (typeof invitationScenarios)[number];
export interface InvitationViewModel {
  readonly id: string;
  readonly tripId: string;
  readonly invitationType: 'EMAIL' | 'LINK';
  readonly email: string | null;
  readonly status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'EXPIRED';
  readonly version: number;
  readonly expiresAt: string;
  readonly resolvedAt: string | null;
  /** People who can join with this invitation (EMAIL is always 1); null on older servers. */
  readonly maxUses?: number | null;
  /** People who already joined with it; null on older servers. */
  readonly useCount?: number | null;
  /** Last 4 characters of a LINK join code; null for EMAIL or older invitations. */
  readonly codeHint?: string | null;
}
export interface InvitationPageViewModel {
  readonly items: readonly InvitationViewModel[];
  readonly nextCursor: string | null;
}
export interface InvitationRepository {
  listInvitations(request: {
    readonly tripId: string;
    readonly scenario: InvitationScenario;
    readonly signal: AbortSignal;
    readonly cursor?: string;
    readonly limit?: number;
    readonly status?: InvitationViewModel['status'];
  }): Promise<ReadResult<InvitationPageViewModel>>;
  createInvitation?(request: {
    readonly tripId: string;
    readonly intent: InvitationCreateIntent;
    readonly signal: AbortSignal;
  }): Promise<InvitationCommandResult<InvitationCreateResult>>;
  revokeInvitation?(request: {
    readonly tripId: string;
    readonly invitationId: string;
    readonly intent: InvitationVersionIntent;
    readonly signal: AbortSignal;
  }): Promise<InvitationCommandResult<InvitationViewModel>>;
  resendInvitation?(request: {
    readonly tripId: string;
    readonly invitationId: string;
    readonly intent: InvitationVersionIntent;
    readonly signal: AbortSignal;
  }): Promise<InvitationCommandResult<InvitationViewModel>>;
  previewInvitation?(
    request: InvitationTarget & { readonly signal: AbortSignal },
  ): Promise<InvitationCommandResult<InvitationPreview>>;
  acceptInvitation?(
    request: InvitationTarget & { readonly idempotencyKey: string; readonly signal: AbortSignal },
  ): Promise<InvitationCommandResult<InvitationAcceptResult>>;
  declineInvitation?(
    request: InvitationTarget & { readonly idempotencyKey: string; readonly signal: AbortSignal },
  ): Promise<InvitationCommandResult<InvitationPreview>>;
  /** Pending EMAIL invitations for the signed-in user's verified email (at most 20). */
  listMyInvitations?(request: {
    readonly signal: AbortSignal;
  }): Promise<ReadResult<readonly InvitationPreview[]>>;
}
/**
 * Which invitation a recipient answers: the secret from a link (`inv1_…` token or a normalized
 * 8-character join code), or the ID of an EMAIL invitation listed by `GET /me/invitations`.
 */
export type InvitationTarget =
  | { readonly token: string; readonly invitationId?: never }
  | { readonly invitationId: string; readonly token?: never };
export const invitationTokenPattern = /^inv1_[A-Za-z0-9_-]{43}$/;
/** Crockford base32 without I, L, O, U, as the Backend mints it. */
const joinCodePattern = /^[0-9A-HJKMNP-TV-Z]{8}$/;
/**
 * Normalizes a typed join code like the Backend: case-insensitive, spaces/dashes removed, O→0,
 * I/L→1. Returns the 8 characters, or undefined when it cannot be a join code.
 */
export function normalizeJoinCode(value: string): string | undefined {
  if (value.length > 32) return undefined;
  const code = value
    .toUpperCase()
    .replace(/[\s-]/g, () => '')
    .replace(/O/g, () => '0')
    .replace(/[IL]/g, () => '1');
  return joinCodePattern.test(code) ? code : undefined;
}
export const formatJoinCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;
export const isJoinCode = (value: string) => joinCodePattern.test(value);

export interface InvitationCreateResult {
  readonly invitation: InvitationViewModel;
  readonly oneTimeLink: string | null;
  /** LINK only, first response only: short code `XXXX-XXXX` and its share page. */
  readonly joinCode?: string | null;
  readonly shareLink?: string | null;
}
export interface InvitationPreview {
  readonly id: string;
  readonly tripName: string;
  readonly inviterDisplayName: string;
  readonly status: InvitationViewModel['status'];
  readonly expiresAt: string;
  /** Absent on older servers. */
  readonly invitationType?: 'EMAIL' | 'LINK' | null;
  readonly tripStartAt?: string | null;
  readonly tripEndAt?: string | null;
}
export interface InvitationAcceptResult {
  readonly membership: MembershipViewModel;
  readonly revisions: {
    readonly planVersion: number;
    readonly membershipRevision: number;
    readonly exportRevision: number;
  };
}
export type InvitationCommandResult<T> =
  | { readonly status: 'success'; readonly data: T; readonly correlationId: string | null }
  | {
      readonly status: 'error';
      readonly error: import('../../../shared/types/result').DomainError;
    };
interface InvitationCreateMetadata {
  readonly idempotencyKey: string;
  readonly expectedMembershipRevision: number;
  readonly expiresAt: string | null;
}
export type InvitationCreateIntent = InvitationCreateMetadata &
  (
    | { readonly invitationType: 'EMAIL'; readonly email: string }
    | {
        readonly invitationType: 'LINK';
        /** 1 = single-use link (default); more than 1 = group link (at most 50). */
        readonly maxUses?: number;
      }
  );
export interface InvitationVersionIntent {
  readonly idempotencyKey: string;
  readonly expectedVersion: number;
}
export function invitationEmailError(value: string): string | undefined {
  const email = value.trim();
  return email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? 'Nhập email hợp lệ, tối đa 255 ký tự.'
    : undefined;
}
