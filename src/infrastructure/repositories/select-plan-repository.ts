import type { PlanRepository } from '../../features/plan/model/plan';
import { createGatewayPlanRepository } from './plan.gateway-repository';
import type { GatewayHttpClient } from '../http/http-client';
export function selectPlanRepository(
  mode: string | undefined,
  allowed: boolean,
  factory?: () => PlanRepository,
  client?: GatewayHttpClient,
): PlanRepository {
  const selected = mode ?? (allowed ? 'fixture' : 'gateway');
  if (selected !== 'fixture' && selected !== 'gateway') throw Error('Invalid data mode');
  if (selected === 'gateway') return createGatewayPlanRepository(undefined, client);
  if (!allowed || !factory)
    throw Error('Fixture requires development or explicit UI preview and factory');
  return factory();
}
