import type { PlanRepository } from '../../features/plan/model/plan';
import { createGatewayPlanRepository } from './plan.gateway-repository';
export function selectPlanRepository(
  mode: string | undefined,
  allowed: boolean,
  factory?: () => PlanRepository,
): PlanRepository {
  const selected = mode ?? (allowed ? 'fixture' : 'gateway');
  if (selected !== 'fixture' && selected !== 'gateway') throw Error('Invalid data mode');
  if (selected === 'gateway') return createGatewayPlanRepository();
  if (!allowed || !factory)
    throw Error('Fixture requires development or explicit UI preview and factory');
  return factory();
}
