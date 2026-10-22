import type { ReadResult } from '../../../shared/types/result';

export type IdentityScenario =
  | 'success'
  | 'loading'
  | 'empty'
  | 'error'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'unavailable';
export const identityScenarios: readonly IdentityScenario[] = [
  'success',
  'loading',
  'empty',
  'error',
  'forbidden',
  'not-found',
  'conflict',
  'unavailable',
];
export interface SelfProfileViewModel {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly avatar: { readonly src: string; readonly alt: string } | null;
  readonly version: number;
  readonly systemRole: 'USER' | 'ADMIN';
  readonly status: 'ACTIVE' | 'LOCKED' | 'ANONYMIZED';
  readonly emailVerifiedAt: string | null;
}
export interface IdentitySessionsViewModel {
  readonly items: readonly {
    readonly id: string;
    readonly createdAt: string;
    readonly lastUsedAt: string | null;
    readonly expiresAt: string;
    readonly revokedAt: string | null;
  }[];
  readonly nextCursor: string | null;
}
export interface IdentityReadRequest {
  readonly scenario?: IdentityScenario;
  readonly signal: AbortSignal;
  readonly cursor?: string | null;
  readonly limit?: number;
}
export interface IdentityRepository {
  readSelf(request: IdentityReadRequest): Promise<ReadResult<SelfProfileViewModel>>;
  listSessions(request: IdentityReadRequest): Promise<ReadResult<IdentitySessionsViewModel>>;
  login?(request: { intent: LoginIntent; signal: AbortSignal }): Promise<
    | { status: 'authenticated'; profile: SelfProfileViewModel; correlationId: string | null }
    | { status: 'error'; error: import('../../../shared/types/result').DomainError }
  >;
  register?(request: { intent: RegistrationIntent; signal: AbortSignal }): Promise<
    | { status: 'accepted'; correlationId: string | null }
    | { status: 'error'; error: import('../../../shared/types/result').DomainError }
  >;
  updateProfile?(request: {
    intent: ProfileUpdateIntent;
    signal: AbortSignal;
  }): Promise<
    | { status: 'updated'; profile: SelfProfileViewModel; correlationId: string | null }
    | { status: 'error'; error: import('../../../shared/types/result').DomainError }
  >;
  revokeSession?(request: {
    sessionId: string;
    signal: AbortSignal;
  }): Promise<{ status: 'revoked'; correlationId: string | null } | { status: 'error'; error: import('../../../shared/types/result').DomainError }>;
  getAvatar?(request: { signal: AbortSignal }): Promise<
    | { status: 'ready'; bytes: ArrayBuffer; contentType: string | null; correlationId: string | null }
    | { status: 'error'; error: import('../../../shared/types/result').DomainError }
  >;
  uploadAvatar?(request: { file: Blob; filename: string; signal: AbortSignal }): Promise<
    | { status: 'uploaded'; objectKey: string; correlationId: string | null }
    | { status: 'error'; error: import('../../../shared/types/result').DomainError }
  >;
  changePassword?(request: { currentPassword: string; newPassword: string; signal: AbortSignal }): Promise<
    | { status: 'changed'; correlationId: string | null }
    | { status: 'error'; error: import('../../../shared/types/result').DomainError }
  >;
  resendEmailVerification?(request: { signal: AbortSignal }): Promise<IdentityAcceptedResult>;
  confirmEmailVerification?(request: { token: string; signal: AbortSignal }): Promise<IdentityAcceptedResult>;
  requestPasswordReset?(request: { email: string; signal: AbortSignal }): Promise<IdentityAcceptedResult>;
  resetPassword?(request: { token: string; newPassword: string; signal: AbortSignal }): Promise<IdentityAcceptedResult>;
}

export type IdentityAcceptedResult =
  | { status: 'accepted'; correlationId: string | null }
  | { status: 'error'; error: import('../../../shared/types/result').DomainError };
// These intent fields keep form validation separate from the Gateway adapter.
export interface LoginIntent {
  readonly email: string;
  readonly password: string;
}
export interface RegistrationIntent extends LoginIntent {
  readonly fullName: string;
}
export interface ProfileUpdateIntent {
  readonly fullName: string;
  readonly expectedVersion: number;
  readonly avatarObjectKey?: string | null;
}
