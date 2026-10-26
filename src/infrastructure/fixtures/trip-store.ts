import type { TripListItem } from '../../features/trips/model/trip-list';
import { fixtureTripCatalog, previewTripId } from './trip-catalog';

/** One store per fixture application. Never mutate the shared seed catalog. */
export function createFixtureTripStore(seed: readonly TripListItem[] = fixtureTripCatalog) {
  let records = structuredClone([...seed]);
  const descriptions = new Map<string, string | null>([
    [previewTripId, 'Khám phá Đà Nẵng – thành phố biển xinh đẹp với những người bạn đồng hành.'],
  ]);
  const publicDescriptions = new Map<string, string | null>();
  return {
    readTrips: () => structuredClone(records),
    readDescription: (tripId: string) => descriptions.get(tripId) ?? null,
    readPublicDescription: (tripId: string) => publicDescriptions.get(tripId) ?? null,
    saveTrip(
      trip: TripListItem,
      description: string | null,
      publicDescription: string | null = null,
    ) {
      const index = records.findIndex((record) => record.id === trip.id);
      if (index < 0) records = [...records, structuredClone(trip)];
      else
        records = records.map((record, position) =>
          position === index ? structuredClone(trip) : record,
        );
      descriptions.set(trip.id, description);
      publicDescriptions.set(trip.id, publicDescription);
    },
  };
}

export type FixtureTripStore = ReturnType<typeof createFixtureTripStore>;
