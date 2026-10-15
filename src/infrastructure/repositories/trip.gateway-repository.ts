import type { TripRepository } from '../../features/trips/repositories/trip.repository';

// Integration supplies a verified session-bound projection reader; no HTTP route is assumed here.
export type GatewayTripListReader = TripRepository['listTrips'];

export function createGatewayTripRepository(
  reader?: GatewayTripListReader,
  detailReader?: TripRepository['getTrip'],
): TripRepository {
  return {
    getTrip:
      detailReader ??
      (async ({ signal }) => {
        signal.throwIfAborted();
        return {
          status: 'error',
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: false },
        };
      }),
    listTrips:
      reader ??
      (async ({ signal }) => {
        signal.throwIfAborted();
        return {
          status: 'error',
          error: {
            code: 'SERVICE_UNAVAILABLE',
            correlationId: null,
            retryable: false,
          },
        };
      }),
  };
}
