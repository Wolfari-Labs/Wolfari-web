import type { TripDetailScenario } from './trip-detail';
import type { TripListScenario } from './trip-list';

export const tripQueryKeys = {
  all: ['trip'] as const,
  list: (scenario: TripListScenario) => ['trips', 'list', scenario] as const,
  detail: (tripId: string, scenario: TripDetailScenario) =>
    ['trip', 'detail', tripId, scenario] as const,
};
