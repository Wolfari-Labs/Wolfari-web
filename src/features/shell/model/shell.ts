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
  viewer:
    | {
        id?: string;
        fullName: string;
        version: number;
        systemRole: 'USER' | 'ADMIN';
        hasAvatar: boolean;
      }
    | null;
  trip: {
    id: string;
    planVersion: number;
    membershipRevision: number;
    exportRevision: number;
    permissions: { canRead: boolean; canUpdate: boolean };
  } | null;
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
