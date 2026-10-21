import type { PackingItemViewModel } from '../plan/model/plan';

export interface PackingGroup { readonly category: string; readonly items: readonly PackingItemViewModel[] }

export type PackingFilter = 'ALL' | 'MINE' | 'TODO';

export type PackingSuggestionKind = 'item' | 'category' | 'create-item' | 'create-category';

export interface PackingSuggestion {
  readonly id: string;
  readonly label: string;
  readonly secondary?: string;
  readonly kind: PackingSuggestionKind;
}

export interface PackingSuggestionCatalog {
  readonly itemNames: readonly string[];
  readonly categories: readonly string[];
  readonly itemCategories: Readonly<Record<string, string>>;
}

export interface PackingFormValues {
  readonly name: string;
  readonly category: string;
  readonly quantity: string;
  readonly unit: string;
  readonly assignedMemberId: string;
  readonly dueDate: string;
  readonly reminder: string;
  readonly note: string;
}

export type PackingFormErrors = Partial<Record<keyof PackingFormValues, string>>;

export interface PackingPreviewItem extends PackingItemViewModel {
  readonly reminder?: string | null;
}

export const emptyPackingForm: PackingFormValues = {
  name: '',
  category: '',
  quantity: '1',
  unit: '',
  assignedMemberId: '',
  dueDate: '',
  reminder: '',
  note: '',
};

const defaultPackingItems = ['Áo khoác mỏng', 'Áo mưa', 'Áo thun', 'Kem chống nắng', 'Sạc dự phòng'];
const defaultPackingCategories = ['Quần áo', 'Chăm sóc cá nhân', 'Đồ vệ sinh', 'Điện tử', 'Khác'];
const defaultItemCategories: Readonly<Record<string, string>> = {
  'ao khoac mong': 'Quần áo',
  'ao mua': 'Quần áo',
  'ao thun': 'Quần áo',
  'kem chong nang': 'Chăm sóc cá nhân',
  'sac du phong': 'Điện tử',
};

export function normalizePackingText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').trim();
}

function uniquePackingValues(values: readonly string[]) {
  const seen = new Set<string>();
  return values.map((value) => value.trim()).filter((value) => {
    const normalized = normalizePackingText(value);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function createPackingSuggestionCatalog(items: readonly PackingItemViewModel[] = [], session: Partial<PackingSuggestionCatalog> = {}): PackingSuggestionCatalog {
  const itemCategories: Record<string, string> = {};
  for (const item of items) if (item.category) itemCategories[normalizePackingText(item.name)] = item.category;
  return {
    itemNames: uniquePackingValues([...items.map((item) => item.name), ...(session.itemNames ?? []), ...defaultPackingItems]),
    categories: uniquePackingValues([...items.map((item) => item.category ?? ''), ...(session.categories ?? []), ...defaultPackingCategories]),
    itemCategories: { ...defaultItemCategories, ...itemCategories, ...(session.itemCategories ?? {}) },
  };
}

function rankPackingSuggestion(value: string, query: string) {
  const normalized = normalizePackingText(value);
  if (!query) return 0;
  if (normalized.startsWith(query)) return 0;
  if (normalized.includes(query)) return 1;
  return 2;
}

function getSuggestions(values: readonly string[], query: string, kind: 'item' | 'category', secondaryByValue: Readonly<Record<string, string>> = {}) {
  const normalizedQuery = normalizePackingText(query);
  const matching: PackingSuggestion[] = values
    .filter((value) => !normalizedQuery || normalizePackingText(value).includes(normalizedQuery))
    .sort((a, b) => rankPackingSuggestion(a, normalizedQuery) - rankPackingSuggestion(b, normalizedQuery) || a.localeCompare(b, 'vi'))
    .slice(0, 3)
    .map((value) => ({ id: `${kind}-${normalizePackingText(value)}`, label: value, ...(secondaryByValue[normalizePackingText(value)] ? { secondary: secondaryByValue[normalizePackingText(value)] } : {}), kind }));
  const exact = values.some((value) => normalizePackingText(value) === normalizedQuery);
  if (normalizedQuery && !exact) {
    matching.push({ id: `create-${kind}`, label: query.trim(), secondary: kind === 'item' ? `+ Tạo “${query.trim()}”` : `+ Tạo danh mục “${query.trim()}”`, kind: kind === 'item' ? 'create-item' : 'create-category' });
  }
  return matching;
}

export function getPackingItemSuggestions(catalog: PackingSuggestionCatalog, query: string) {
  return getSuggestions(catalog.itemNames, query, 'item', catalog.itemCategories);
}

export function getPackingCategorySuggestions(catalog: PackingSuggestionCatalog, query: string) {
  return getSuggestions(catalog.categories, query, 'category');
}

export function packingFormFromItem(item: PackingPreviewItem, timezone: string): PackingFormValues {
  const dueDate = item.dueAt
    ? new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(item.dueAt))
    : '';
  return {
    name: item.name,
    category: item.category ?? '',
    quantity: item.quantity,
    unit: item.unit ?? '',
    assignedMemberId: item.assignedMemberId ?? '',
    dueDate,
    reminder: item.reminder ?? '',
    note: item.note ?? '',
  };
}

export function validatePackingForm(values: PackingFormValues): PackingFormErrors {
  const errors: PackingFormErrors = {};
  const name = values.name.trim();
  const quantity = values.quantity.trim();
  if (!name) errors.name = 'Vui lòng nhập tên vật dụng.';
  else if (name.length > 200) errors.name = 'Tên vật dụng tối đa 200 ký tự.';
  if (!/^\d+(?:\.\d{1,2})?$/.test(quantity) || Number(quantity) <= 0) {
    errors.quantity = 'Số lượng phải là số dương, tối đa 2 chữ số thập phân.';
  }
  if (values.category.trim().length > 80) errors.category = 'Danh mục tối đa 80 ký tự.';
  if (values.unit.trim().length > 30) errors.unit = 'Đơn vị tối đa 30 ký tự.';
  if (values.note.trim().length > 500) errors.note = 'Ghi chú tối đa 500 ký tự.';
  if (values.reminder.trim().length > 80) errors.reminder = 'Nhắc nhở tối đa 80 ký tự.';
  if (values.dueDate) {
    const parsed = new Date(`${values.dueDate}T00:00:00`);
    if (!Number.isFinite(parsed.getTime())) errors.dueDate = 'Ngày hạn không hợp lệ.';
  }
  return errors;
}

export function packingItemsFromForm(
  values: PackingFormValues,
  existing: PackingPreviewItem | null,
  tripId: string,
  planVersion: number,
  timezone: string,
  now = new Date(),
): PackingPreviewItem {
  const dueIso = values.dueDate ? packingDateToIso(values.dueDate, timezone) : null;
  return {
    id: existing?.id ?? `preview-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    tripId,
    name: values.name.trim(),
    quantity: values.quantity.trim(),
    unit: values.unit.trim() || null,
    note: values.note.trim() || null,
    category: values.category.trim() || null,
    assignedMemberId: values.assignedMemberId || null,
    dueAt: dueIso,
    status: existing?.status ?? 'TODO',
    source: existing?.source ?? 'MANUAL',
    completedByUserId: existing?.completedByUserId ?? null,
    completedAt: existing?.completedAt ?? null,
    planVersion,
    reminder: values.reminder.trim() || null,
  };
}

export function packingDateToIso(value: string, timezone: string) {
  const base = new Date(`${value}T23:59:00Z`);
  if (!Number.isFinite(base.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(base);
  const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value ?? 0);
  const displayedAsUtc = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour') % 24, part('minute'), part('second'));
  return new Date(base.getTime() - (displayedAsUtc - base.getTime())).toISOString();
}

export function filterPackingItems(
  items: readonly PackingItemViewModel[],
  filter: PackingFilter,
  category: string,
  viewerMemberId: string,
) {
  return items.filter((item) => {
    const matchesFilter = filter === 'ALL'
      || (filter === 'TODO' && item.status === 'TODO')
      || (filter === 'MINE' && item.assignedMemberId === viewerMemberId);
    const matchesCategory = category === 'ALL' || (item.category?.trim() || 'Khác') === category;
    return matchesFilter && matchesCategory;
  });
}

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
