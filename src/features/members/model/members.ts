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
  previewInvitation?(request: {
    readonly token: string;
    readonly signal: AbortSignal;
  }): Promise<InvitationCommandResult<InvitationPreview>>;
  acceptInvitation?(request: {
    readonly token: string;
    readonly idempotencyKey: string;
    readonly signal: AbortSignal;
  }): Promise<InvitationCommandResult<InvitationAcceptResult>>;
  declineInvitation?(request: {
    readonly token: string;
    readonly idempotencyKey: string;
    readonly signal: AbortSignal;
  }): Promise<InvitationCommandResult<InvitationPreview>>;
}

export interface InvitationCreateResult {
  readonly invitation: InvitationViewModel;
  readonly oneTimeLink: string | null;
}
export interface InvitationPreview {
  readonly id: string;
  readonly tripName: string;
  readonly inviterDisplayName: string;
  readonly status: InvitationViewModel['status'];
  readonly expiresAt: string;
}
export interface InvitationAcceptResult {
  readonly membership: MembershipViewModel;
  readonly revisions: { readonly planVersion: number; readonly membershipRevision: number; readonly exportRevision: number };
}
export type InvitationCommandResult<T> =
  | { readonly status: 'success'; readonly data: T; readonly correlationId: string | null }
  | { readonly status: 'error'; readonly error: import('../../../shared/types/result').DomainError };
interface InvitationCreateMetadata {
  readonly idempotencyKey: string;
  readonly expectedMembershipRevision: number;
  readonly expiresAt: string | null;
}
export type InvitationCreateIntent = InvitationCreateMetadata &
  (
    | { readonly invitationType: 'EMAIL'; readonly email: string }
    | { readonly invitationType: 'LINK' }
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
