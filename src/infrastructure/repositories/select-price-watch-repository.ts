import type { PriceWatchRepository } from '../../features/price-watch/model/price-watch';
import { createGatewayPriceWatchRepository } from './price-watch.gateway-repository';

export function selectPriceWatchRepository(
  mode: string | undefined,
  allowed: boolean,
  factory?: () => PriceWatchRepository,
): PriceWatchRepository {
  const selected = mode ?? (allowed ? 'fixture' : 'gateway');
  if (selected !== 'fixture' && selected !== 'gateway') throw Error('Invalid data mode');
  if (selected === 'gateway') return createGatewayPriceWatchRepository();
  if (!allowed || !factory)
    throw Error('Fixture requires development or explicit UI preview and factory');
  return factory();
}
