import * as d from '../http/decode';

export const financeCommandKinds = [
  'contribution-reverse',
  'note-create',
  'note-edit',
  'note-delete',
  'expense-create',
  'expense-edit',
  'expense-delete',
  'expense-submit',
  'expense-withdraw',
  'expense-confirm',
  'expense-reject',
  'expense-reverse',
] as const;
export type FinanceCommandKind = (typeof financeCommandKinds)[number];
export function isFinanceCommand(kind: string): kind is FinanceCommandKind {
  return (financeCommandKinds as readonly string[]).includes(kind);
}
const versions = ['expected_version', 'expected_finance_version'];
const expenseFields = [
  'title',
  'description',
  'amount',
  'category',
  'paid_at',
  'payment_method',
  'receipt_object_key',
];
export function validateFinanceCommand(kind: FinanceCommandKind, body: Record<string, unknown>) {
  if (kind === 'contribution-reverse') {
    if (Object.keys(body).some((k) => ![...versions, 'reason'].includes(k)))
      throw Error('Invalid reversal field');
    for (const key of versions) d.version(body[key]);
    if (
      typeof body.reason !== 'string' ||
      !body.reason.trim() ||
      body.reason.includes('\0') ||
      [...body.reason.trim()].length > 1024
    )
      throw Error('Nhập lý do đảo khoản đóng (tối đa 1024 ký tự).');
    return;
  }
  if (kind.startsWith('note-')) {
    const allowed =
      kind === 'note-delete'
        ? versions
        : [
            'description',
            'amount',
            'payer_user_id',
            ...(kind === 'note-create' ? ['expected_finance_version'] : versions),
          ];
    if (Object.keys(body).some((k) => !allowed.includes(k))) throw Error('Invalid note field');
    for (const k of allowed.filter((k) => k.startsWith('expected_'))) d.version(body[k]);
    if (kind === 'note-create' || Object.hasOwn(body, 'description')) {
      if (
        typeof body.description !== 'string' ||
        !body.description.trim() ||
        body.description.includes('\0')
      )
        throw Error('Nhập nội dung ghi chú.');
    }
    if (body.amount != null) d.money(body.amount);
    if (body.payer_user_id != null) d.uuid(body.payer_user_id);
    if (
      kind === 'note-edit' &&
      !['description', 'amount', 'payer_user_id'].some((k) => Object.hasOwn(body, k))
    )
      throw Error('Empty patch');
    return;
  }
  const fields =
    kind === 'expense-create'
      ? [...expenseFields, 'expected_finance_version']
      : kind === 'expense-edit'
        ? [...expenseFields, ...versions]
        : kind === 'expense-confirm'
          ? ['paid_at', 'payment_method', ...versions]
          : kind === 'expense-reject' || kind === 'expense-reverse'
            ? ['reason', ...versions]
            : versions;
  if (Object.keys(body).some((k) => !fields.includes(k)))
    throw Error('Trường dữ liệu không hợp lệ.');
  for (const k of fields.filter((k) => k.startsWith('expected_'))) d.version(body[k]);
  const text = (key: string, max: number, required = false) => {
    const value = body[key];
    if (!required && (value === undefined || value === null)) return;
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.includes('\0') ||
      [...value.trim()].length > max
    )
      throw Error('Nội dung không hợp lệ: ' + key);
  };
  text('title', 200, kind === 'expense-create');
  text('description', 10000);
  text('category', 80);
  text('receipt_object_key', 1024);
  text('payment_method', 30, kind === 'expense-confirm');
  text('reason', 1024, kind === 'expense-reject' || kind === 'expense-reverse');
  if (kind === 'expense-create' || body.amount !== undefined) d.money(body.amount, true);
  if (kind === 'expense-confirm' || body.paid_at != null) d.instant(body.paid_at);
  if (kind === 'expense-edit' && !expenseFields.some((k) => Object.hasOwn(body, k)))
    throw Error('Không có thay đổi.');
}
export function financeCommandRoute(
  kind: FinanceCommandKind,
  fundId?: string,
  resourceId?: string,
): { path: string; method: 'POST' | 'PATCH' | 'DELETE' } {
  const root = '/api/v1/funds/' + d.uuid(fundId);
  if (kind === 'contribution-reverse')
    return { path: '/api/v1/contributions/' + d.uuid(resourceId) + '/reverse', method: 'POST' };
  if (kind === 'note-create') return { path: root + '/notes', method: 'POST' };
  if (kind === 'note-edit' || kind === 'note-delete')
    return {
      path: '/api/v1/notes/' + d.uuid(resourceId),
      method: kind === 'note-edit' ? 'PATCH' : 'DELETE',
    };
  if (kind === 'expense-create') return { path: root + '/expenses', method: 'POST' };
  const action = kind.slice('expense-'.length);
  return {
    path:
      '/api/v1/expenses/' +
      d.uuid(resourceId) +
      (['edit', 'delete'].includes(action) ? '' : '/' + action),
    method: action === 'edit' ? 'PATCH' : action === 'delete' ? 'DELETE' : 'POST',
  };
}
