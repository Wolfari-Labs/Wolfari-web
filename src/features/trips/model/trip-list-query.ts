import type { TripLifecycle, TripListItem } from './trip-list';

export type TripStatusFilter = 'ALL' | TripLifecycle;
export type TripDateSort = 'listed' | 'start-asc' | 'start-desc';
export interface TripListFilter {
  readonly name: string;
  readonly status: TripStatusFilter;
  readonly sort: TripDateSort;
}
export const initialTripFilter: TripListFilter = { name: '', status: 'ALL', sort: 'listed' };

function normalized(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi')
    .trim();
}

// This operates only on the supplied readable projection, never on a server query/envelope.
export function selectTrips(items: readonly TripListItem[], filter: TripListFilter) {
  const term = normalized(filter.name);
  const readable = items.filter(
    (item) => item.permissions.canRead && item.currentMembership.leftAt === null,
  );
  const counts: Record<TripStatusFilter, number> = {
    ALL: readable.length,
    UPCOMING: 0,
    ONGOING: 0,
    COMPLETED: 0,
    ARCHIVED: 0,
  };
  for (const item of readable) counts[item.lifecycle]++;
  const visible = readable.filter(
    (item) =>
      (filter.status === 'ALL' || item.lifecycle === filter.status) &&
      normalized(item.name).includes(term),
  );
  if (filter.sort !== 'listed') {
    const direction = filter.sort === 'start-asc' ? 1 : -1;
    visible.sort(
      (a, b) =>
        direction * (Date.parse(a.startAt) - Date.parse(b.startAt)) || a.id.localeCompare(b.id),
    );
  }
  return { visible, counts };
}

export function tripDateLabel(item: Pick<TripListItem, 'startAt' | 'endAt' | 'timezone'>) {
  const date = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: item.timezone,
  });
  const startDate = new Date(item.startAt);
  const endDate = new Date(Date.parse(item.endAt) - 1);
  const start = date.format(startDate);
  const end = date.format(endDate);
  if (start === end) return start;
  const parts = (value: Date) =>
    Object.fromEntries(date.formatToParts(value).map((part) => [part.type, part.value]));
  const from = parts(startDate),
    to = parts(endDate);
  return from.month === to.month && from.year === to.year
    ? `${from.day} – ${end}`
    : `${start} – ${end}`;
}
