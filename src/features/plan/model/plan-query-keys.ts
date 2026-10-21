import type { PlanScenario } from './plan';

export const planQueryKeys = {
  all: ['plan'] as const,
  detail: (tripId: string, scenario: PlanScenario) => ['plan', tripId, scenario] as const,
};
