import type { ActivityViewModel } from './plan';
import { calendarDate, tripCalendarDays } from '../../../shared/lib/calendar';
export function localDate(instant: string, timezone: string) {
  return calendarDate(instant, timezone);
}
export function planDays(startAt: string, endAt: string, timezone: string) {
  return tripCalendarDays(startAt, endAt, timezone);
}
/** Calendar day an activity is shown in; `'POOL'` when it has no day yet. */
export function activityPlanDay(
  activity: Pick<ActivityViewModel, 'startsAt' | 'scheduledDate'>,
  timezone: string,
) {
  return activity.startsAt
    ? localDate(activity.startsAt, timezone)
    : (activity.scheduledDate ?? 'POOL');
}
export function activitiesForDay(
  items: readonly ActivityViewModel[],
  day: string,
  timezone: string,
) {
  return items
    .filter((a) =>
      a.startsAt !== null ? localDate(a.startsAt, timezone) === day : a.scheduledDate === day,
    )
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}
export function activityTime(value: string | null, timezone: string) {
  return value
    ? new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: timezone,
      }).format(new Date(value))
    : 'Chưa xếp giờ';
}

const weekdayFormat = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: 'UTC' });
/** Web v2 day heading for a `YYYY-MM-DD` calendar day, e.g. "Thứ Ba, 22/09". */
export function dayHeading(day: string) {
  const weekday = weekdayFormat.format(new Date(`${day}T00:00:00Z`));
  return `${weekday.charAt(0).toLocaleUpperCase('vi')}${weekday.slice(1)}, ${day.slice(8, 10)}/${day.slice(5, 7)}`;
}
