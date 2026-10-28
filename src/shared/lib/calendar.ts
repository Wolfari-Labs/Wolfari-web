/** Calendar days are strings; only instants are parsed as Date. */
export function calendarDate(instant: string | number, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  }).formatToParts(new Date(instant));
  const field = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${field('year')}-${field('month')}-${field('day')}`;
}
export function validCalendarDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function nextCalendarDate(day: string): string {
  if (!validCalendarDate(day)) throw new Error('Ngày không hợp lệ.');
  return new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}
export function lastTripDate(endAt: string, timezone: string): string {
  return calendarDate(Date.parse(endAt) - 1, timezone);
}
export function tripCalendarDays(startAt: string, endAt: string, timezone: string): string[] {
  if (!(Date.parse(endAt) > Date.parse(startAt))) throw new Error('Khoảng ngày không hợp lệ.');
  const days: string[] = [];
  const last = lastTripDate(endAt, timezone);
  for (let day = calendarDate(startAt, timezone); day <= last; day = nextCalendarDate(day))
    days.push(day);
  return days;
}
