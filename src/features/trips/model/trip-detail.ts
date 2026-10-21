import type { TripListItem } from './trip-list';

export const tripDetailScenarios = [
  'success',
  'loading',
  'empty',
  'error',
  'forbidden',
  'not-found',
  'conflict',
  'unavailable',
] as const;
export type TripDetailScenario = (typeof tripDetailScenarios)[number];
export interface TripDetailViewModel extends TripListItem {
  readonly description: string | null;
  readonly publicDescription: string | null;
  readonly archivedAt: string | null;
  readonly planEditPolicy: 'OWNER_ONLY' | 'SELECTED_MEMBERS' | 'ALL_MEMBERS';
}
