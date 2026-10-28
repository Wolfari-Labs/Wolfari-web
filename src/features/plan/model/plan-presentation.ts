import type { ActivityViewModel } from './plan';
import { calendarDate, tripCalendarDays } from '../../../shared/lib/calendar';
export function localDate(instant: string, timezone: string) {
  return calendarDate(instant, timezone);
}
export function planDays(startAt: string, endAt: string, timezone: string) {
  return tripCalendarDays(startAt, endAt, timezone);
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
