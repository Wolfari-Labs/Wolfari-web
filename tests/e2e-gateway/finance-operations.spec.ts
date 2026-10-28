import { test, expect, login } from './gateway-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';
const fundId = '77777777-1111-4111-8111-111111111111';

test('HTTP mock: Finance 202 survives reload, NEEDS_REVIEW blocks replacement; pagination does not manufacture balance', async ({ page, gateway }) => {
  let key = '', writes = 0, review = false;
  const pages: string[] = [];
  const fund = { id: fundId, trip_id: tripId, holder_user_id: gateway.profile.id, currency: 'VND', budget_amount: null, current_balance: '9007199254740993', reserved_refund: '0', available_balance: '9007199254740993', status: 'OPEN', finance_version: 3, closed_at: null };
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname;
    const respond = (data: unknown, status = 200) => route.fulfill({ status, json: { data, meta: { correlation_id: 'mock-only' } } });
    if (path === `/api/v1/trips/${tripId}/fund`) return respond(fund);
    if (path === `/api/v1/funds/${fundId}/budget`) {
      writes++; key = route.request().headers()['idempotency-key']!;
      expect(route.request().postDataJSON()).toEqual({ budget_amount: '1000000', expected_finance_version: 3 });
      return respond({ operation_id: key, trip_id: tripId, state: 'PENDING_RECOVERY' }, 202);
    }
    if (path === `/api/v1/operations/${key}`) return respond({ operation_id: key, trip_id: tripId, state: review ? 'NEEDS_REVIEW' : 'PENDING_RECOVERY' });
    if (path === `/api/v1/funds/${fundId}/destinations`) return respond([]);
    if (path === `/api/v1/funds/${fundId}/transactions`) {
      const cursor = url.searchParams.get('cursor'); pages.push(cursor ?? 'first');
      return respond({ items: [{ id: cursor ? '88888888-2222-4222-8222-222222222222' : '88888888-1111-4111-8111-111111111111', fund_id: fundId, sequence: cursor ? '9007199254740993' : '9007199254740992', direction: 'IN', transaction_type: 'CONTRIBUTION', amount: '1', balance_after: '9007199254740993', contribution_id: null, expense_id: null, refund_id: null, reversal_of_id: null, actor_user_id: gateway.profile.id, reason: null, created_at: '2026-10-28T00:00:00Z' }], next_cursor: cursor ? null : 'page_2' });
    }
    if (path.startsWith(`/api/v1/funds/${fundId}/`)) return respond({ items: [], next_cursor: null });
    return route.fallback();
  });
  await login(page); await page.goto(`/trips/${tripId}/fund`);
  await expect(page.getByRole('region', { name: 'Trạng thái quỹ thật' })).toContainText('9.007.199.254.740.993 ₫');
  await page.getByRole('button', { name: 'Tải thêm ledger' }).click();
  await expect(page.getByRole('region', { name: 'Ledger' }).getByRole('listitem')).toHaveCount(2);
  expect(pages).toContain('page_2');
  await page.getByRole('button', { name: 'Sửa ngân sách', exact: true }).click();
  await page.getByLabel('Ngân sách (VND)').fill('1000000');
  await page.getByRole('button', { name: 'Xác nhận · Sửa ngân sách', exact: true }).click();
  await expect(page.getByText(/Server đang chờ phục hồi/)).toBeVisible();
  await expect(page.getByText(/Server đã xác nhận hoàn tất/)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sửa ngân sách', exact: true })).toBeDisabled();
  review = true;
  await page.getByRole('button', { name: 'Kiểm tra lại kết quả' }).click();
  await expect(page.getByText(/Thao tác cần đối soát/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gửi lại đúng yêu cầu' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Đã đọc kết quả' })).toHaveCount(0);
  expect(writes).toBe(1);
});
