import { test, expect, login } from './gateway-fixture';
import AxeBuilder from '@axe-core/playwright';
const tripId = '11111111-1111-4111-8111-111111111111',
  fundId = '77777777-1111-4111-8111-111111111111',
  noteId = '22222222-2222-4222-8222-222222222222';
test('HTTP mock: outside-fund note CRUD does not change balance and preserves null vs zero', async ({
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
  let note: Record<string, unknown> | null = null;
  await page.route('**/api/v1/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    const respond = (data: unknown, status = 200) =>
      route.fulfill({ status, json: { data, meta: { correlation_id: 'mock-only' } } });
    if (path === `/api/v1/trips/${tripId}/fund`) return respond(fund);
    if (path.endsWith('/destinations')) return respond([]);
    if (req.method() === 'GET' && path.startsWith(`/api/v1/funds/${fundId}/`))
      return respond({ items: path.endsWith('/notes') && note ? [note] : [], next_cursor: null });
    if (path.endsWith('/notes') || path === `/api/v1/notes/${noteId}`) {
      const body = req.postDataJSON();
      expect(body.expected_finance_version).toBe(fund.finance_version);
      fund.finance_version++;
      if (req.method() === 'DELETE') {
        note = null;
        return respond({
          operation_id: req.headers()['idempotency-key'],
          trip_id: tripId,
          state: 'SUCCEEDED',
        });
      }
      note = {
        id: noteId,
        fund_id: fundId,
        description: body.description,
        amount: body.amount,
        payer_user_id: body.payer_user_id,
        created_by_user_id: gateway.profile.id,
        created_at: '2026-11-12T00:00:00Z',
        updated_at: '2026-11-12T00:00:00Z',
        version: Number(note?.version ?? 0) + 1,
        finance_version: fund.finance_version,
      };
      return respond(note, req.method() === 'POST' ? 201 : 200);
    }
    return route.fallback();
  });
  await login(page);
  await page.goto(`/trips/${tripId}/fund`);
  await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
  await page.getByRole('button', { name: 'Ngoài quỹ', exact: true }).click();
  await page.getByRole('button', { name: 'Tải thêm thành viên để chọn người chi' }).click();
  await expect(
    page.getByRole('button', { name: 'Tải thêm thành viên để chọn người chi' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Thêm chi ngoài quỹ', exact: true }).click();
  await page.getByLabel('Nội dung chi ngoài quỹ').fill('Ăn sáng tự trả');
  await page.getByRole('button', { name: 'Xác nhận · Thêm chi ngoài quỹ' }).click();
  const row = page.getByRole('article', { name: 'Ăn sáng tự trả' });
  await expect(row).toContainText('Chưa ghi số tiền');
  expect(fund.current_balance).toBe('500000');
  await row.getByRole('button', { name: 'Sửa ghi chú', exact: true }).click();
  await page.getByLabel('Số tiền VND (không bắt buộc)').fill('0');
  await page.getByRole('button', { name: 'Xác nhận · Sửa ghi chú' }).click();
  await expect(row).toContainText('0 ₫');
  await page.setViewportSize({ width: 402, height: 850 });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await row.getByRole('button', { name: 'Xóa ghi chú', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận · Xóa ghi chú' }).click();
  await expect(row).toHaveCount(0);
  expect(fund.current_balance).toBe('500000');
});

for (const status of ['CLOSING', 'CLOSED']) {
  test(`HTTP mock: notes remain readable and immutable in ${status}`, async ({ page, gateway }) => {
    await page.route('**/api/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      const respond = (data: unknown) =>
        route.fulfill({ json: { data, meta: { correlation_id: 'mock-only' } } });
      if (path === `/api/v1/trips/${tripId}/fund`)
        return respond({
          id: fundId,
          trip_id: tripId,
          holder_user_id: gateway.profile.id,
          currency: 'VND',
          budget_amount: null,
          current_balance: '0',
          reserved_refund: '0',
          available_balance: '0',
          status,
          finance_version: 3,
          closed_at: status === 'CLOSED' ? '2026-11-12T00:00:00Z' : null,
        });
      if (path.endsWith('/destinations')) return respond([]);
      if (path.startsWith(`/api/v1/funds/${fundId}/`))
        return respond({ items: [], next_cursor: null });
      return route.fallback();
    });
    await login(page);
    await page.goto(`/trips/${tripId}/fund`);
    await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
    await page.getByRole('button', { name: 'Ngoài quỹ', exact: true }).click();
    await expect(page.getByText('Chưa có ghi chú ngoài quỹ.')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Thêm chi ngoài quỹ', exact: true }),
    ).toBeDisabled();
  });
}
