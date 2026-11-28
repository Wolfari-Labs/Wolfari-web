import { useQuery } from '@tanstack/react-query';
import { useRuntimeServices } from '../../app/gateway-context';
import type { PlanViewModel } from '../plan/model/plan';
import { localDate } from '../plan/model/plan-presentation';
import type { TripDetailViewModel } from '../trips/model/trip-detail';

export function weatherLocation(plan: PlanViewModel | null, date: string, timezone: string) {
  if (!plan?.permissions.canRead) return null;
  const valid = plan.selectedLocations.flatMap((location) => {
    if (!location.latitude?.trim() || !location.longitude?.trim()) return [];
    const latitude = Number(location.latitude),
      longitude = Number(location.longitude);
    return Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180
      ? [{ id: location.id, name: location.name, latitude, longitude }]
      : [];
  });
  const scheduledIds = plan.activities
    .filter(
      (activity) =>
        (activity.startsAt ? localDate(activity.startsAt, timezone) : activity.scheduledDate) ===
        date,
    )
    .map((activity) => activity.selectedLocationId);
  return valid.find((location) => scheduledIds.includes(location.id)) ?? valid[0] ?? null;
}

export function useTripWeather({
  trip,
  plan,
  date,
}: {
  trip: TripDetailViewModel;
  plan: PlanViewModel | null;
  date: string;
}) {
  const repository = useRuntimeServices()?.weather;
  const location = weatherLocation(plan, date, trip.timezone);
  const allowed =
    trip.permissions.canRead &&
    !trip.currentMembership.leftAt &&
    plan?.tripId === trip.id &&
    plan.planVersion === trip.planVersion &&
    plan.exportRevision === trip.exportRevision &&
    !!repository &&
    !!location;
  const query = useQuery({
    queryKey: [
      'weather',
      trip.currentMembership.userId,
      trip.id,
      location?.latitude,
      location?.longitude,
      date,
    ],
    queryFn: ({ signal }) =>
      repository!.forecast({
        latitude: location!.latitude,
        longitude: location!.longitude,
        date,
        signal,
      }),
    enabled: allowed,
    staleTime: 3 * 3600_000,
    retry: false,
  });
  return { query, location, available: allowed };
}
