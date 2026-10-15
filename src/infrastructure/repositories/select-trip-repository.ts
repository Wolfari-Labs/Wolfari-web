import type { TripRepository } from '../../features/trips/repositories/trip.repository';
import { createGatewayTripRepository } from './trip.gateway-repository';

export async function selectTripRepository(
  mode: string | undefined,
  previewAllowed: boolean,
  fixtureFactory?: () => TripRepository,
): Promise<TripRepository> {
  const selected = mode ?? (previewAllowed ? 'fixture' : 'gateway');
  if (selected !== 'fixture' && selected !== 'gateway') throw new Error('Invalid data mode');
  if (selected === 'fixture') {
    if (!previewAllowed) throw new Error('Fixture requires development or explicit UI preview');
    if (!fixtureFactory) throw new Error('Fixture factory is missing');
    return fixtureFactory();
  }
  return createGatewayTripRepository();
}
