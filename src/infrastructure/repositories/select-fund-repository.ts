import type { FundRepository } from '../../features/fund/model/fund';
import { createGatewayFundRepository } from './fund.gateway-repository';

export function selectFundRepository(
  mode: string | undefined,
  allowed: boolean,
  factory?: () => FundRepository,
): FundRepository {
  const selected = mode ?? (allowed ? 'fixture' : 'gateway');
  if (selected !== 'fixture' && selected !== 'gateway') throw Error('Invalid data mode');
  if (selected === 'gateway') return createGatewayFundRepository();
  if (!allowed || !factory) throw Error('Fixture requires development or explicit UI preview and factory');
  return factory();
}
