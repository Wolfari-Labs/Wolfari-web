import type { PackingItemViewModel } from '../plan/model/plan';

export interface PackingGroup { readonly category: string; readonly items: readonly PackingItemViewModel[] }

export type PackingFilter = 'ALL' | 'MINE' | 'TODO';

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
  void timezone;
  const dueIso = values.dueDate ? new Date(`${values.dueDate}T23:59:00`).toISOString() : null;
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
