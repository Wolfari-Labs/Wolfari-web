// View models, never HTTP envelopes or database entities.
export type { DomainError, ReadResult } from '../../../shared/types/result';
export type ShellScenario =
  | 'success'
  | 'guest'
  | 'admin'
  | 'forbidden-snapshot'
  | 'loading'
  | 'empty'
  | 'error'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'unavailable';

export type ShellSection =
  | 'overview'
  | 'map'
  | 'plan'
  | 'dress'
  | 'packing'
  | 'members'
  | 'fund'
  | 'fare'
  | 'settings'
  | 'tools';

export interface ShellSnapshot {
  viewer: { id?: string; fullName: string; version: number; systemRole: 'USER' | 'ADMIN' } | null;
  trip: {
    id: string;
    planVersion: number;
    membershipRevision: number;
    exportRevision: number;
    permissions: { canRead: boolean; canUpdate: boolean };
  } | null;
}

// Reserved for future verified write contracts; this read-only shell exposes no mutations.
export interface MutationIntent {
  idempotencyKey: string;
  expectedPlanVersion: number;
  expectedMembershipRevision: number;
  expectedExportRevision: number;
}

export const scenarios: readonly ShellScenario[] = [
  'success',
  'guest',
  'admin',
  'forbidden-snapshot',
  'loading',
  'empty',
  'error',
  'forbidden',
  'not-found',
  'conflict',
  'unavailable',
];

export type AdminSection =
  'overview' | 'accounts' | 'providers' | 'monitoring' | 'audit' | 'configuration';
