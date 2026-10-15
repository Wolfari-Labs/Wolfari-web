import type { ReadResult } from '../../../shared/types/result';
export interface HomeTripPreview {
  readonly id: string;
  readonly name: string;
  readonly dates: string;
  readonly memberCount: number | null;
  readonly cover: { readonly src: string; readonly alt: string } | null;
  readonly planVersion: number;
  readonly membershipRevision: number;
  readonly exportRevision: number;
  readonly permissions: { readonly canRead: boolean; readonly canUpdate: boolean };
}
export interface HomeViewModel {
  readonly viewerName: string | null;
  readonly featured: ReadResult<HomeTripPreview> | { readonly status: 'loading' };
  readonly landing: ReadResult<HomeLandingViewModel> | { readonly status: 'loading' };
}
export type HomeScenario =
  | 'success'
  | 'loading'
  | 'empty'
  | 'error'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'unavailable';
export const homeScenarios: readonly HomeScenario[] = [
  'success',
  'loading',
  'empty',
  'error',
  'forbidden',
  'not-found',
  'conflict',
  'unavailable',
];
export interface HomeLandingViewModel {
  readonly inspiration: {
    readonly title: string;
    readonly subtitle: string;
    readonly cover: { readonly src: string; readonly alt: string };
  } | null;
  readonly stories: readonly {
    readonly name: string;
    readonly duration: string;
    readonly cover: { readonly src: string; readonly alt: string } | null;
  }[];
}
export interface HomeRepository {
  readLanding(input: {
    scenario: HomeScenario;
    signal: AbortSignal;
  }): Promise<ReadResult<HomeLandingViewModel>>;
}
