import type { ActivityViewModel, SelectedLocationViewModel } from '../plan/model/plan';
import { activityTime, localDate } from '../plan/model/plan-presentation';

export type LocationScheduleFilter = 'ALL' | 'SCHEDULED' | 'UNSCHEDULED';

export interface MapLocationPresentation {
  readonly location: SelectedLocationViewModel;
  readonly activities: readonly ActivityViewModel[];
  readonly markerNumber: number;
  readonly scheduled: boolean;
}

export function validCoordinates(
  location: SelectedLocationViewModel,
): { latitude: number; longitude: number } | null {
  if (location.latitude === null || location.longitude === null) return null;
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  )
    return null;
  return { latitude, longitude };
}

export function mapLocationPresentations(
  locations: readonly SelectedLocationViewModel[],
  activities: readonly ActivityViewModel[],
): readonly MapLocationPresentation[] {
  return locations.map((location, index) => {
    const linkedActivities = activities
      .filter((activity) => activity.selectedLocationId === location.id)
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    return {
      location,
      activities: linkedActivities,
      markerNumber: index + 1,
      scheduled: linkedActivities.length > 0,
    };
  });
}

export function activityScheduleLabel(
  activity: ActivityViewModel | undefined,
  timezone: string,
) {
  if (!activity?.startsAt) return 'Đã lưu · Chưa xếp lịch';
  const start = activityTime(activity.startsAt, timezone);
  const end = activityTime(activity.endsAt, timezone);
  const day = localDate(activity.startsAt, timezone);
  return `${day} · ${start}${activity.endsAt ? `–${end}` : ''}`;
}

export function activityDurationLabel(activity: ActivityViewModel | undefined) {
  if (!activity?.startsAt || !activity.endsAt) return null;
  const minutes = Math.round(
    (new Date(activity.endsAt).getTime() - new Date(activity.startsAt).getTime()) / 60_000,
  );
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes % 60 === 0) return `${minutes / 60} giờ`;
  if (minutes < 60) return `${minutes} phút`;
  return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
}

export function selectMapLocations({
  locations,
  activities,
  filter,
  day,
  timezone,
  query = '',
}: {
  locations: readonly SelectedLocationViewModel[];
  activities: readonly ActivityViewModel[];
  filter: LocationScheduleFilter;
  day: string | null;
  timezone: string;
  query?: string;
}) {
  const allScheduled = new Set(
    activities
      .map((activity) => activity.selectedLocationId)
      .filter((id): id is string => id !== null),
  );
  const scheduledForDay =
    day === null
      ? allScheduled
      : new Set(
          activities
            .filter(
              (activity) =>
                activity.startsAt && localDate(activity.startsAt, timezone) === day,
            )
            .map((activity) => activity.selectedLocationId)
            .filter((id): id is string => id !== null),
        );
  const normalizedQuery = query.trim().toLocaleLowerCase('vi');
  return locations.filter((location) => {
    const scheduled = allScheduled.has(location.id);
    if (filter === 'SCHEDULED' && !scheduled) return false;
    if (filter === 'UNSCHEDULED' && scheduled) return false;
    if (day !== null && !scheduledForDay.has(location.id)) return false;
    if (
      normalizedQuery &&
      !`${location.name} ${location.address ?? ''}`
        .toLocaleLowerCase('vi')
        .includes(normalizedQuery)
    )
      return false;
    return true;
  });
}
