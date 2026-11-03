import { test, expect, login } from './gateway-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';
const fundId = '77777777-1111-4111-8111-111111111111';

test('HTTP mock: Finance waits for authoritative refresh before a new intent and preserves an already-open draft on conflict', async ({
  page,
  gateway,
}) => {
  const fund = {
    id: fundId,
    trip_id: tripId,
    holder_user_id: gateway.profile.id,
    currency: 'VND',
    budget_amount: null as string | null,
    current_balance: '0',
    reserved_refund: '0',
    available_balance: '0',
    status: 'OPEN',
    finance_version: 3,
    closed_at: null,
  };
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let holdRefresh = false,
    refreshEntered = false;
  const writes: { expected_finance_version: number; budget_amount: string }[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const respond = (data: unknown) =>
      route.fulfill({
        status: 200,
        json: { data, meta: { correlation_id: 'mock-refresh-only' } },
      });
    if (path === `/api/v1/trips/${tripId}/fund`) {
      if (holdRefresh) {
        refreshEntered = true;
        await gate;
      }
      return respond({ ...fund });
    }
    if (path === `/api/v1/funds/${fundId}/budget`) {
      const body = route.request().postDataJSON();
      writes.push(body);
      if (body.expected_finance_version !== fund.finance_version)
        return route.fulfill({
          status: 409,
          json: {
            error: { code: 'VERSION_CONFLICT', message: 'Stale fund', retryable: false },
            meta: { correlation_id: 'mock-refresh-conflict' },
          },
        });
      fund.budget_amount = body.budget_amount;
      fund.finance_version++;
      holdRefresh = true;
      return respond({ ...fund });
    }
    if (path === `/api/v1/funds/${fundId}/destinations`) return respond([]);
    if (path.startsWith(`/api/v1/funds/${fundId}/`))
      return respond({ items: [], next_cursor: null });
    return route.fallback();
  });
  try {
    await login(page);
    await page.goto(`/trips/${tripId}/fund`);
    const action = page.getByRole('button', { name: 'Sửa ngân sách', exact: true });
    await action.click();
    await page.getByLabel('Ngân sách (VND)').fill('1000000');
    await page.getByRole('button', { name: 'Xác nhận · Sửa ngân sách', exact: true }).click();
    await expect(page.getByText('Đã hoàn tất thao tác.', { exact: true })).toBeVisible();
    await expect.poll(() => refreshEntered).toBe(true);
    // A successful receipt does not imply that the read projection is current.
    await expect(action).toBeDisabled();
    holdRefresh = false;
    release();
    await expect(action).toBeEnabled();
    await action.click();
    await expect(page.getByLabel('Ngân sách (VND)')).toHaveValue('1000000');
    await page.getByLabel('Ngân sách (VND)').fill('2000000');
    await page.getByRole('button', { name: 'Xác nhận · Sửa ngân sách', exact: true }).click();
    await expect(page.getByRole('form', { name: 'Sửa ngân sách', exact: true })).toHaveCount(0);
    expect(writes.map((body) => body.expected_finance_version)).toEqual([3, 4]);
    await expect(action).toBeEnabled();
    await action.click();
    await page.getByLabel('Ngân sách (VND)').fill('3000000');
    fund.finance_version++; // Another actor advances the server after this draft was opened.
    holdRefresh = false;
    const refreshed = page.waitForResponse((r) => r.url().endsWith(`/trips/${tripId}/fund`));
    await page.getByRole('button', { name: 'Tải lại quỹ' }).click();
    await refreshed;
    await page.getByRole('button', { name: 'Xác nhận · Sửa ngân sách', exact: true }).click();
    await expect(page.getByText(/Dữ liệu đã thay đổi/)).toBeVisible();
    await expect(page.getByLabel('Ngân sách (VND)')).toHaveValue('3000000');
    expect(writes.map((body) => body.expected_finance_version)).toEqual([3, 4, 5]);
    expect(fund.finance_version).toBe(6);
    expect(fund.budget_amount).toBe('2000000');
  } finally {
    holdRefresh = false;
    release();
  }
});
