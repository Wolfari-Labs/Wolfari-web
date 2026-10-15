import type { HomeRepository } from '../../features/home/model/home';
import { createGatewayHomeRepository } from './home.gateway-repository';
export function selectHomeRepository(
  mode: string | undefined,
  allowed: boolean,
  factory?: () => HomeRepository,
): HomeRepository {
  const selected = mode ?? (allowed ? 'fixture' : 'gateway');
  if (selected !== 'fixture' && selected !== 'gateway') throw new Error('Invalid data mode');
  if (selected === 'gateway') return createGatewayHomeRepository();
  if (!allowed || !factory)
    throw new Error('Fixture requires development or explicit UI preview and factory');
  return factory();
}
