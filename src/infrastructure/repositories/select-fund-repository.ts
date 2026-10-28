import type { FundRepository } from '../../features/fund/model/fund';
import { createGatewayFundRepository } from './fund.gateway-repository';
import type { GatewayHttpClient } from '../http/http-client';
import type { CommandCoordinator } from '../operations/command-coordinator';

export function selectFundRepository(
  mode: string | undefined,
  allowed: boolean,
  factory?: () => FundRepository,
  client?: GatewayHttpClient,
  commands?: CommandCoordinator,
): FundRepository {
  const selected = mode ?? (allowed ? 'fixture' : 'gateway');
  if (selected !== 'fixture' && selected !== 'gateway') throw Error('Invalid data mode');
  if (selected === 'gateway') return createGatewayFundRepository(undefined, client, commands);
  if (!allowed || !factory) throw Error('Fixture requires development or explicit UI preview and factory');
  return factory();
}
