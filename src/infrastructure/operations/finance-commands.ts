import * as d from '../http/decode';

export const financeCommandKinds = [
  'payment-create',
  'payment-reconcile',
  'payment-resolve',
  'closure-create',
  'closure-confirm',
  'closure-cancel',
  'closure-remind',
  'refund-create',
  'refund-assign-verifier',
  'refund-report-paid',
  'refund-confirm-received',
  'refund-confirm-nonreceipt',
  'refund-cancel',
  'refund-request-reversal',
  'refund-consent-reversal',
  'refund-reverse',
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
  'handover-create',
  'handover-accept',
  'handover-refresh-snapshot',
  'handover-confirm',
  'handover-cancel',
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
  if (kind.startsWith('payment-')) {
    const allowed =
      kind === 'payment-create'
        ? ['provider', ...versions]
        : kind === 'payment-reconcile'
          ? ['reason']
          : [
              'resolution',
              'linked_attempt_id',
              'reason',
              'expected_finance_version',
              'previous_holder_transfer_confirmed',
            ];
    if (Object.keys(body).some((key) => !allowed.includes(key)))
      throw Error('Invalid payment field');
    if (kind === 'payment-create') {
      d.enumeration(body.provider, ['MOMO_SANDBOX']);
      for (const key of versions) d.version(body[key]);
    } else {
      if (
        typeof body.reason !== 'string' ||
        !body.reason.trim() ||
        body.reason.includes('\0') ||
        [...body.reason].length > 1024
      )
        throw Error('Nhập lý do đối soát (tối đa 1024 ký tự).');
      if (kind === 'payment-resolve') {
        d.version(body.expected_finance_version);
        const resolution = d.enumeration(body.resolution, ['LINKED', 'NO_FINANCIAL_EFFECT']);
        if (resolution === 'LINKED') {
          d.uuid(body.linked_attempt_id);
          if (
            body.previous_holder_transfer_confirmed !== undefined &&
            body.previous_holder_transfer_confirmed !== true
          )
            throw Error('Invalid transfer confirmation');
        } else if (
          body.linked_attempt_id !== undefined ||
          body.previous_holder_transfer_confirmed !== undefined
        )
          throw Error('Invalid resolution fields');
      }
    }
    return;
  }
  if (kind.startsWith('handover-')) {
    const allowed =
      kind === 'handover-create'
        ? ['new_holder_user_id', 'expected_finance_version']
        : [
            ...versions,
            ...(kind === 'handover-confirm' ? ['expected_snapshot_finance_version'] : []),
            ...(kind === 'handover-cancel' ? ['reason'] : []),
          ];
    if (Object.keys(body).some((k) => !allowed.includes(k))) throw Error('Invalid handover field');
    for (const key of allowed.filter((k) => k.startsWith('expected_'))) d.version(body[key]);
    if (kind === 'handover-create') {
      if (typeof body.new_holder_user_id !== 'string' || !body.new_holder_user_id)
        throw Error('Chọn người giữ quỹ mới.');
      d.uuid(body.new_holder_user_id);
    }
    if (
      kind === 'handover-cancel' &&
      (typeof body.reason !== 'string' ||
        !body.reason.trim() ||
        body.reason.includes('\0') ||
        [...body.reason.trim()].length > 1024)
    )
      throw Error('Nhập lý do hủy bàn giao (tối đa 1024 ký tự).');
    return;
  }
  if (kind.startsWith('closure-')) {
    const allowed =
      kind === 'closure-create'
        ? ['expected_finance_version']
        : kind === 'closure-confirm'
          ? ['snapshot_hash']
          : kind === 'closure-cancel'
            ? ['reason']
            : [];
    if (Object.keys(body).some((k) => !allowed.includes(k))) throw Error('Invalid closure field');
    if (kind === 'closure-create') d.version(body.expected_finance_version);
    if (
      kind === 'closure-confirm' &&
      (typeof body.snapshot_hash !== 'string' || !/^[a-f0-9]{64}$/.test(body.snapshot_hash))
    )
      throw Error('Invalid snapshot hash');
    if (
      kind === 'closure-cancel' &&
      (typeof body.reason !== 'string' ||
        !body.reason.trim() ||
        body.reason.includes('\0') ||
        [...body.reason.trim()].length > 1024)
    )
      throw Error('Nhập lý do hủy (tối đa 1024 ký tự).');
    return;
  }
  if (kind.startsWith('refund-')) {
    const create = kind === 'refund-create';
    const reasonRequired =
      create ||
      [
        'refund-confirm-nonreceipt',
        'refund-cancel',
        'refund-request-reversal',
        'refund-reverse',
      ].includes(kind);
    const verifier = kind === 'refund-assign-verifier';
    const allowed = create
      ? ['member_user_id', 'amount', 'reason', 'expected_finance_version']
      : [
          ...versions,
          ...(reasonRequired ? ['reason'] : []),
          ...(verifier ? ['verifier_user_id'] : []),
        ];
    if (Object.keys(body).some((k) => !allowed.includes(k))) throw Error('Invalid refund field');
    for (const key of allowed.filter((k) => k.startsWith('expected_'))) d.version(body[key]);
    if (verifier) {
      if (typeof body.verifier_user_id !== 'string' || !body.verifier_user_id)
        throw Error('Chọn người kiểm chứng.');
      d.uuid(body.verifier_user_id);
    }
    if (
      reasonRequired &&
      (typeof body.reason !== 'string' ||
        !body.reason.trim() ||
        body.reason.includes('\0') ||
        [...body.reason.trim()].length > 1024)
    )
      throw Error('Nhập lý do (tối đa 1024 ký tự).');
    if (create) {
      d.uuid(body.member_user_id);
      d.money(body.amount, true);
    }
    return;
  }
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
  if (kind === 'payment-create')
    return {
      path: '/api/v1/contributions/' + d.uuid(resourceId) + '/payment-attempts',
      method: 'POST',
    };
  if (kind === 'payment-reconcile')
    return {
      path: '/api/v1/payment-attempts/' + d.uuid(resourceId) + '/reconcile',
      method: 'POST',
    };
  if (kind === 'payment-resolve')
    return {
      path: '/api/v1/payment-exceptions/' + d.uuid(resourceId) + '/resolve',
      method: 'POST',
    };
  if (kind === 'handover-create') return { path: root + '/holder-handovers', method: 'POST' };
  if (kind.startsWith('handover-'))
    return {
      path: '/api/v1/holder-handovers/' + d.uuid(resourceId) + '/' + kind.slice('handover-'.length),
      method: 'POST',
    };
  if (kind === 'closure-create') return { path: root + '/closures', method: 'POST' };
  if (kind.startsWith('closure-'))
    return { path: '/api/v1/closures/' + d.uuid(resourceId) + '/' + kind.slice(8), method: 'POST' };
  if (kind === 'refund-create') return { path: root + '/refunds', method: 'POST' };
  if (kind.startsWith('refund-'))
    return { path: '/api/v1/refunds/' + d.uuid(resourceId) + '/' + kind.slice(7), method: 'POST' };
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
