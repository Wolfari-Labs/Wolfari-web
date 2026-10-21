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
  readonly scenario: IdentityScenario;
  readonly signal: AbortSignal;
}
export interface IdentityRepository {
  readSelf(request: IdentityReadRequest): Promise<ReadResult<SelfProfileViewModel>>;
  listSessions(request: IdentityReadRequest): Promise<ReadResult<IdentitySessionsViewModel>>;
}
// These verified intent fields reserve the future adapter boundary; this preview exposes no write.
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
}
