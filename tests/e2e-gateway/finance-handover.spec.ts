import { test, expect, login } from './gateway-fixture';
import AxeBuilder from '@axe-core/playwright';

const tripId = '11111111-1111-4111-8111-111111111111',
  fundId = '77777777-1111-4111-8111-111111111111',
  handoverId = '33333333-3333-4333-8333-333333333333',
  nominee = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

test('HTTP mock: Holder handover nominate, stale snapshot refresh, confirm and cancel', async ({
  page,
  gateway,
}) => {
  const fund = {
    id: fundId,
    trip_id: tripId,
    holder_user_id: gateway.profile.id,
    currency: 'VND',
    budget_amount: null,
    current_balance: '500000',
    reserved_refund: '0',
    available_balance: '500000',
    status: 'OPEN',
    finance_version: 4,
    closed_at: null,
  };
  const time = '2026-11-16T01:00:00Z';
  const snapshot = {
    current_balance: '500000',
    reserved_refund: '0',
    available_balance: '500000',
    ledger_sequence: '2',
    fingerprint: 'b'.repeat(64),
    pending_contribution_ids: [],
    pending_refund_ids: [],
    pending_expense_ids: [],
    pending_payment_ids: [],
    payment_destination_ids: [],
    pending_payment_exception_ids: [],
  };
  let row: Record<string, unknown> | null = null;
  const actions: string[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    const respond = (data: unknown, status = 200) =>
      route.fulfill({ status, json: { data, meta: { correlation_id: 'mock-only' } } });
    if (path === `/api/v1/trips/${tripId}/fund`) return respond(fund);
    if (path.endsWith('/destinations')) return respond([]);
    if (request.method() === 'GET' && path === `/api/v1/funds/${fundId}/holder-handovers`)
      return respond({ items: row ? [row] : [] });
    if (request.method() === 'GET' && path.startsWith(`/api/v1/funds/${fundId}/`))
      return respond({ items: [], next_cursor: null });
    if (request.method() === 'POST' && path === `/api/v1/funds/${fundId}/holder-handovers`) {
      const body = request.postDataJSON();
      expect(body).toEqual({ new_holder_user_id: nominee, expected_finance_version: 4 });
      actions.push('create');
      row = {
        id: handoverId,
        fund_id: fundId,
        old_holder_user_id: gateway.profile.id,
        new_holder_user_id: nominee,
        nominated_by_user_id: gateway.profile.id,
        status: 'NOMINATED',
        version: 1,
        finance_version: fund.finance_version,
        snapshot_finance_version: null,
        snapshot: null,
        snapshot_stale: false,
        accepted_at: null,
        old_holder_confirmed_at: null,
        new_holder_confirmed_at: null,
        completed_at: null,
        cancelled_at: null,
        cancellation_reason: null,
        created_at: time,
        updated_at: time,
      };
      return respond(row, 201);
    }
    if (request.method() === 'POST' && path.startsWith(`/api/v1/holder-handovers/${handoverId}/`)) {
      const body = request.postDataJSON();
      const action = path.split('/').at(-1)!;
      actions.push(action);
      expect(body.expected_version).toBe(row!.version);
      expect(body.expected_finance_version).toBe(fund.finance_version);
      if (action === 'confirm') {
        expect(body.expected_snapshot_finance_version).toBe(row!.snapshot_finance_version);
        Object.assign(row!, { old_holder_confirmed_at: time });
      }
      if (action === 'refresh-snapshot')
        Object.assign(row!, {
          snapshot_stale: false,
          snapshot_finance_version: fund.finance_version,
        });
      if (action === 'cancel')
        Object.assign(row!, {
          status: 'CANCELLED',
          cancelled_at: time,
          cancellation_reason: body.reason,
        });
      Object.assign(row!, { version: Number(row!.version) + 1, updated_at: time });
      return respond(row);
    }
    return route.fallback();
  });
  await login(page);
  await page.goto(`/trips/${tripId}/fund`);
  const openSection = async () => {
    await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
    await page.getByRole('button', { name: 'Bàn giao Fund Holder', exact: true }).click();
  };
  const run = async (label: string) => {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận · ' + label, exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Xác nhận · ' + label, exact: true }),
    ).toHaveCount(0);
  };
  await openSection();
  await expect(page.getByText('Chưa có lần bàn giao người giữ quỹ nào.')).toBeVisible();
  await page.getByRole('button', { name: 'Đề cử người giữ quỹ mới', exact: true }).click();
  await page.getByLabel('Người giữ quỹ mới', { exact: true }).selectOption(nominee);
  await page
    .getByRole('button', { name: 'Xác nhận · Đề cử người giữ quỹ mới', exact: true })
    .click();
  await expect(page.getByText('Đã đề cử, chờ người được đề cử đồng ý')).toBeVisible();
  // The current Holder cannot accept on the nominee's behalf.
  await expect(page.getByRole('button', { name: 'Đồng ý nhận giữ quỹ' })).toHaveCount(0);
  // Nominee accepts in their own session, then Finance changes after the snapshot.
  Object.assign(row!, {
    status: 'ACCEPTED',
    accepted_at: time,
    snapshot,
    snapshot_finance_version: fund.finance_version,
    snapshot_stale: true,
    version: Number(row!.version) + 1,
  });
  await page.reload();
  await openSection();
  await expect(page.getByText(/Số liệu quỹ đã thay đổi sau khi chốt/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận đã bàn giao tiền' })).toHaveCount(0);
  await run('Cập nhật bản chốt');
  await expect(page.getByText('500.000 ₫').first()).toBeVisible();
  await run('Xác nhận đã bàn giao tiền');
  await expect(page.getByText(/Người giữ quỹ cũ: đã xác nhận bàn giao/)).toBeVisible();
  await page.getByRole('button', { name: 'Hủy bàn giao', exact: true }).click();
  await page.getByLabel('Lý do hủy', { exact: true }).fill('Đổi kế hoạch');
  await page.getByRole('button', { name: 'Xác nhận · Hủy bàn giao', exact: true }).click();
  await expect(page.getByText('Lý do hủy: Đổi kế hoạch')).toBeVisible();
  await page.setViewportSize({ width: 402, height: 850 });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  expect(actions).toEqual(['create', 'refresh-snapshot', 'confirm', 'cancel']);
});
