import { test, expect, login } from './gateway-fixture';
import AxeBuilder from '@axe-core/playwright';
const tripId = '11111111-1111-4111-8111-111111111111',
  fundId = '77777777-1111-4111-8111-111111111111';
test('HTTP mock: audit history paginates independently of ledger and handles read failure', async ({
  page,
  gateway,
}) => {
  let fail = true;
  const cursors: (string | null)[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname;
    const respond = (data: unknown) =>
      route.fulfill({ json: { data, meta: { correlation_id: 'mock-only' } } });
    if (path === `/api/v1/trips/${tripId}/fund`)
      return respond({
        id: fundId,
        trip_id: tripId,
        holder_user_id: gateway.profile.id,
        currency: 'VND',
        budget_amount: null,
        current_balance: '500000',
        reserved_refund: '0',
        available_balance: '500000',
        status: 'CLOSED',
        closed_at: '2026-11-12T00:00:00Z',
        finance_version: 5,
      });
    if (path.endsWith('/destinations')) return respond([]);
    if (path.endsWith('/history')) {
      if (fail)
        return route.fulfill({
          status: 503,
          json: { error: { code: 'SERVICE_UNAVAILABLE', message: 'Unavailable' } },
        });
      const cursor = url.searchParams.get('cursor');
      cursors.push(cursor);
      return respond({
        items: [
          {
            id: cursor ? '22222222-2222-4222-8222-222222222222' : tripId,
            fund_id: fundId,
            actor_user_id: cursor ? null : gateway.profile.id,
            system_actor: cursor ? 'MOMO_IPN' : null,
            action: cursor ? 'FUTURE_ACTION' : 'CREATE_EXPENSE',
            entity_type: 'Expense',
            entity_id: null,
            from_version: 1,
            to_version: 2,
            reason: cursor ? null : 'Ghi nhận nháp TEST',
            occurred_at: '2026-11-12T00:00:00.123456Z',
            correlation_id: tripId,
          },
        ],
        next_cursor: cursor ? null : 'next_page',
      });
    }
    if (path.startsWith(`/api/v1/funds/${fundId}/`))
      return respond({ items: [], next_cursor: null });
    return route.fallback();
  });
  await login(page);
  await page.goto(`/trips/${tripId}/fund`);
  await expect(page.getByRole('heading', { name: 'Sổ giao dịch', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
  await page.getByRole('button', { name: 'Lịch sử thao tác', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tải lại lịch sử thao tác' })).toBeEnabled();
  fail = false;
  await page.getByRole('button', { name: 'Tải lại lịch sử thao tác' }).click();
  await expect(page.getByText('Lý do: Ghi nhận nháp TEST')).toBeVisible();
  await page.getByRole('button', { name: 'Tải thêm lịch sử thao tác' }).click();
  await expect(page.getByText('Người thực hiện: Hệ thống · MOMO_IPN')).toBeVisible();
  expect(cursors).toContain('next_page');
  await expect(page.getByRole('button', { name: 'Tải thêm lịch sử thao tác' })).toHaveCount(0);
  await page.setViewportSize({ width: 402, height: 850 });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
});
