import type { PackingItemViewModel } from '../plan/model/plan';

export interface PackingGroup { readonly category: string; readonly items: readonly PackingItemViewModel[] }

export function groupPackingItems(items: readonly PackingItemViewModel[]): PackingGroup[] {
  const groups = new Map<string, PackingItemViewModel[]>();
  for (const item of items) {
    const category = item.category?.trim() || 'Khác';
    groups.set(category, [...(groups.get(category) ?? []), item]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a === 'Khác' ? 1 : b === 'Khác' ? -1 : a.localeCompare(b, 'vi'))
    .map(([category, grouped]) => ({ category, items: grouped }));
}

export function packingProgress(items: readonly PackingItemViewModel[]) {
  return { completed: items.filter((item) => item.status === 'COMPLETED').length, total: items.length };
}

export function packingDueDate(value: string | null, timezone: string) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(date);
}
