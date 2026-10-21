import type { ActivityViewModel } from './plan';
export function localDate(instant: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  }).formatToParts(new Date(instant));
  const field = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${field('year')}-${field('month')}-${field('day')}`;
}
export function planDays(startAt: string, endAt: string, timezone: string) {
  const start = localDate(startAt, timezone),
    end = localDate(endAt, timezone),
    days: string[] = [];
  const cursor = new Date(start + 'T00:00:00Z');
  while (cursor.toISOString().slice(0, 10) <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
export function activitiesForDay(
  items: readonly ActivityViewModel[],
  day: string,
  timezone: string,
) {
  return items
    .filter((a) => a.startsAt !== null && localDate(a.startsAt, timezone) === day)
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
