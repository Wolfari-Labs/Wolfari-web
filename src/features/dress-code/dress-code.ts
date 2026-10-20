import type { ActivityViewModel, DressCodeViewModel } from '../plan/model/plan';

export interface DressCodeGroup {
  readonly key: string;
  readonly title: string;
  readonly items: readonly DressCodeViewModel[];
}

export function groupDressCodes(items: readonly DressCodeViewModel[], activities: readonly ActivityViewModel[]): DressCodeGroup[] {
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));
  const buckets = new Map<string, { title: string; rank: number; items: DressCodeViewModel[] }>();
  for (const item of items) {
    const key = item.scopeType === 'TRIP' ? 'trip' : item.scopeType === 'DAY' ? `day:${item.planDate ?? ''}` : `activity:${item.activityId ?? ''}`;
    const activity = item.activityId ? activityById.get(item.activityId) : undefined;
    const title = item.scopeType === 'TRIP'
      ? 'Toàn chuyến đi'
      : item.scopeType === 'DAY'
        ? item.planDate ? `Ngày ${item.planDate.slice(8, 10)}/${item.planDate.slice(5, 7)}` : 'Ngày chưa xác định'
        : activity ? activity.title : 'Hoạt động không còn khả dụng';
    const rank = item.scopeType === 'TRIP' ? 0 : item.scopeType === 'DAY' ? 1 : 2;
    const bucket = buckets.get(key) ?? { title, rank, items: [] };
    bucket.items.push(item);
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[1].rank - b[1].rank || a[0].localeCompare(b[0]))
    .map(([key, value]) => ({ key, title: value.title, items: value.items }));
}
