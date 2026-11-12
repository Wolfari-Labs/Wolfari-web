import { test, expect, login } from './gateway-fixture';
import AxeBuilder from '@axe-core/playwright';
const tripId = '11111111-1111-4111-8111-111111111111',
  fundId = '77777777-1111-4111-8111-111111111111',
  expenseId = '22222222-2222-4222-8222-222222222222';
test('HTTP mock: expense draft submit confirm; responsive permissions and exact ledger balance', async ({
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
    finance_version: 1,
    closed_at: null,
  };
  let expense: Record<string, unknown> | null = null;
  const keys: string[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    const respond = (data: unknown, status = 200) =>
      route.fulfill({ status, json: { data, meta: { correlation_id: 'mock-only' } } });
    if (path === `/api/v1/trips/${tripId}/fund`) return respond(fund);
    if (path === `/api/v1/funds/${fundId}/destinations`) return respond([]);
    if (path.startsWith(`/api/v1/funds/${fundId}/`) && request.method() === 'GET')
      return respond({
        items: path.endsWith('/expenses') && expense ? [expense] : [],
        next_cursor: null,
      });
    if (path.endsWith('/expenses') && request.method() === 'POST') {
      const body = request.postDataJSON();
      keys.push(request.headers()['idempotency-key']!);
      expect(body.expected_finance_version).toBe(fund.finance_version);
      fund.finance_version++;
      expense = {
        id: expenseId,
        fund_id: fundId,
        ...body,
        status: 'DRAFT',
        created_by_user_id: gateway.profile.id,
        receipt_available: false,
        submitted_at: null,
        paid_at: null,
        payment_method: null,
        paid_by_user_id: null,
        confirmed_at: null,
        confirmed_by_user_id: null,
        rejected_reason: null,
        created_at: '2026-11-12T00:00:00Z',
        updated_at: '2026-11-12T00:00:00Z',
        version: 1,
        finance_version: fund.finance_version,
      };
      return respond(expense, 201);
    }
    if (path.startsWith(`/api/v1/expenses/${expenseId}`)) {
      const body = request.postDataJSON();
      keys.push(request.headers()['idempotency-key']!);
      expect(body.expected_finance_version).toBe(fund.finance_version);
      expect(body.expected_version).toBe(expense!.version);
      fund.finance_version++;
      if (request.method() === 'DELETE') {
        expense = null;
        return respond({
          operation_id: request.headers()['idempotency-key'],
          trip_id: tripId,
          state: 'SUCCEEDED',
        });
      }
      const action = path.split('/').at(-1)!;
      const transitions: Record<string, string> = {
        submit: 'SUBMITTED',
        withdraw: 'DRAFT',
        confirm: 'CONFIRMED',
        reject: 'REJECTED',
        reverse: 'REVERSED',
      };
      expense = {
        ...expense!,
        ...(request.method() === 'PATCH' ? body : {}),
        version: Number(expense!.version) + 1,
        finance_version: fund.finance_version,
        status: transitions[action] ?? expense!.status,
        rejected_reason: action === 'reject' ? body.reason : null,
      };
      if (expense!.status === 'CONFIRMED') {
        fund.current_balance = '300000';
        fund.available_balance = '300000';
      }
      if (action === 'reverse') {
        fund.current_balance = '500000';
        fund.available_balance = '500000';
      }
      return respond(expense);
    }
    return route.fallback();
  });
  await login(page);
  await page.goto(`/trips/${tripId}/fund`);
  await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
  await page.getByRole('button', { name: 'Khoản chi', exact: true }).click();
  await page.getByRole('button', { name: 'Tạo đề nghị chi', exact: true }).click();
  await page.getByLabel('Tên khoản chi').fill('Khách sạn');
  await page.getByLabel('Số tiền VND').fill('200000');
  await page.getByRole('button', { name: 'Xác nhận · Tạo đề nghị chi', exact: true }).click();
  const row = page.getByRole('article', { name: 'Khách sạn' });
  await expect(row).toContainText('Bản nháp');
  expect(fund.current_balance).toBe('500000');
  await row.getByRole('button', { name: 'Sửa nháp', exact: true }).click();
  await page.getByLabel('Mô tả').fill('Đề nghị chi TEST');
  await page.getByRole('button', { name: 'Xác nhận · Sửa nháp', exact: true }).click();
  await expect(row).toContainText('Đề nghị chi TEST');
  await row.getByRole('button', { name: 'Gửi đề nghị', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận · Gửi đề nghị', exact: true }).click();
  await expect(row).toContainText('Chờ xác nhận');
  expect(fund.current_balance).toBe('500000');
  await row.getByRole('button', { name: 'Rút đề nghị', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận · Rút đề nghị', exact: true }).click();
  await expect(row).toContainText('Bản nháp');
  await row.getByRole('button', { name: 'Gửi đề nghị', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận · Gửi đề nghị', exact: true }).click();
  await row.getByRole('button', { name: 'Xác nhận khoản chi', exact: true }).click();
  await page.getByLabel('Thời điểm chi (giờ máy)').fill('2026-11-12T10:00');
  await page.getByLabel('Phương thức chi').fill('CASH');
  await page.getByRole('button', { name: 'Xác nhận · Xác nhận khoản chi', exact: true }).click();
  await expect(row).toContainText('Đã ghi sổ');
  expect(fund.current_balance).toBe('300000');
  expect(new Set(keys).size).toBe(6);
  await expect(row.getByRole('button', { name: 'Xóa nháp' })).toHaveCount(0);
  await page.setViewportSize({ width: 402, height: 850 });
  await expect
    .poll(() =>
      page
        .getByRole('dialog', { name: 'Cài đặt quỹ nhóm' })
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    )
    .toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('expenses-402.png') });
  await row.getByRole('button', { name: 'Đảo khoản chi', exact: true }).click();
  await page.getByLabel('Lý do', { exact: true }).fill('Ghi sai, điều chỉnh TEST');
  await page.getByRole('button', { name: 'Xác nhận · Đảo khoản chi', exact: true }).click();
  await expect(row).toContainText('Đã đảo');
  expect(fund.current_balance).toBe('500000');
  await page.getByRole('button', { name: 'Tạo đề nghị chi', exact: true }).click();
  await page.getByLabel('Tên khoản chi').fill('Khách sạn');
  await page.getByLabel('Số tiền VND').fill('200000');
  await page.getByRole('button', { name: 'Xác nhận · Tạo đề nghị chi', exact: true }).click();
  await expect(row).toContainText('Bản nháp');
  await row.getByRole('button', { name: 'Xóa nháp', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận · Xóa nháp', exact: true }).click();
  await expect(row).toHaveCount(0);
  expect(fund.current_balance).toBe('500000');
  await page.getByRole('button', { name: 'Tạo đề nghị chi', exact: true }).click();
  await page.getByLabel('Tên khoản chi').fill('Khách sạn');
  await page.getByLabel('Số tiền VND').fill('200000');
  await page.getByRole('button', { name: 'Xác nhận · Tạo đề nghị chi', exact: true }).click();
  await row.getByRole('button', { name: 'Gửi đề nghị', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận · Gửi đề nghị', exact: true }).click();
  await row.getByRole('button', { name: 'Từ chối khoản chi', exact: true }).click();
  await page.getByLabel('Lý do', { exact: true }).fill('Cần kiểm tra lại');
  await page.getByRole('button', { name: 'Xác nhận · Từ chối khoản chi', exact: true }).click();
  await expect(row).toContainText('Cần kiểm tra lại');
  expect(fund.current_balance).toBe('500000');
});

for (const scenario of ['member', 'owner-not-holder', 'CLOSING', 'CLOSED', 'archived'] as const) {
  test(`HTTP mock: expense permission ${scenario}`, async ({ page, gateway }) => {
    const memberId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const trip = gateway.trips.find((t) => t.id === tripId)!;
    if (scenario === 'member') trip.current_membership.role = 'MEMBER';
    if (scenario === 'archived') {
      trip.archived_at = '2026-11-12T00:00:00Z';
      trip.lifecycle = 'ARCHIVED';
    }
    const fund = {
      id: fundId,
      trip_id: tripId,
      holder_user_id: ['member', 'owner-not-holder'].includes(scenario)
        ? memberId
        : gateway.profile.id,
      currency: 'VND',
      budget_amount: null,
      current_balance: '500000',
      reserved_refund: '0',
      available_balance: '500000',
      status: ['CLOSING', 'CLOSED'].includes(scenario) ? scenario : 'OPEN',
      finance_version: 1,
      closed_at: null,
    };
    await page.route('**/api/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      const respond = (data: unknown) =>
        route.fulfill({ json: { data, meta: { correlation_id: 'mock-only' } } });
      if (path === `/api/v1/trips/${tripId}/fund`) return respond(fund);
      if (path.endsWith('/destinations')) return respond([]);
      if (path.startsWith(`/api/v1/funds/${fundId}/`))
        return respond({
          items: path.endsWith('/expenses')
            ? [
                {
                  id: expenseId,
                  fund_id: fundId,
                  title: 'Đề nghị của người khác',
                  description: null,
                  amount: '200000',
                  category: null,
                  status: 'SUBMITTED',
                  created_by_user_id: memberId,
                  receipt_available: false,
                  submitted_at: null,
                  paid_at: null,
                  payment_method: null,
                  paid_by_user_id: null,
                  confirmed_at: null,
                  confirmed_by_user_id: null,
                  rejected_reason: null,
                  created_at: '2026-11-12T00:00:00Z',
                  updated_at: '2026-11-12T00:00:00Z',
                  version: 1,
                  finance_version: 1,
                },
              ]
            : [],
          next_cursor: null,
        });
      return route.fallback();
    });
    await login(page);
    await page.goto(`/trips/${tripId}/fund`);
    await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
    await page.getByRole('button', { name: 'Khoản chi', exact: true }).click();
    const row = page.getByRole('article', { name: 'Đề nghị của người khác' });
    await expect(row).toBeVisible();
    await expect(row.getByRole('button', { name: 'Rút đề nghị', exact: true })).toHaveCount(0);
    if (['member', 'owner-not-holder'].includes(scenario)) {
      await expect(
        row.getByRole('button', { name: 'Xác nhận khoản chi', exact: true }),
      ).toHaveCount(0);
    } else {
      await expect(
        page.getByRole('button', { name: 'Tạo đề nghị chi', exact: true }),
      ).toBeDisabled();
      await expect(
        row.getByRole('button', { name: 'Xác nhận khoản chi', exact: true }),
      ).toBeDisabled();
    }
  });
}
