import { test, expect, login } from './gateway-fixture';
import AxeBuilder from '@axe-core/playwright';
const trip = '11111111-1111-4111-8111-111111111111',
  fundId = '77777777-1111-4111-8111-111111111111',
  id = '22222222-2222-4222-8222-222222222222';
test('HTTP mock: Sandbox create, reload recovery, reconcile and exception resolution', async ({
  page,
  gateway,
}) => {
  const now = '2026-11-20T00:00:00Z';
  const fund = {
    id: fundId,
    trip_id: trip,
    holder_user_id: gateway.profile.id,
    currency: 'VND',
    budget_amount: null,
    current_balance: '0',
    reserved_refund: '0',
    available_balance: '0',
    status: 'OPEN',
    finance_version: 1,
    closed_at: null,
  };
  const contribution = {
    id,
    fund_id: fundId,
    request_id: id,
    member_user_id: gateway.profile.id,
    amount: '10000',
    status: 'PENDING',
    self_contribution: true,
    version: 1,
    finance_version: 1,
    member_reported_at: null,
    confirmed_at: null,
    confirmed_by_user_id: null,
    waived_reason: null,
    cancelled_reason: null,
    rejected_reason: null,
  };
  const requestRow = {
    id,
    fund_id: fundId,
    title: 'Thu thử MoMo',
    status: 'OPEN',
    version: 1,
    finance_version: 1,
    created_by_user_id: gateway.profile.id,
    created_at: now,
    due_at: null,
    note: null,
    amount_per_member: null,
    closed_at: null,
    contributions: [contribution],
  };
  const attempt = {
    id,
    contribution_id: id,
    provider: 'MOMO_SANDBOX',
    environment: 'SANDBOX',
    amount: '10000',
    currency: 'VND',
    status: 'PENDING',
    needs_reconciliation: true,
    payment_url: 'https://test-payment.momo.vn/pay',
    expires_at: '2099-01-01T00:00:00Z',
    error_code: null,
    created_at: now,
    updated_at: now,
  };
  const exception = {
    id,
    payment_attempt_id: id,
    processing_status: 'NEEDS_REVIEW',
    review_reason: 'Đối soát giao dịch cũ',
    received_at: now,
    reviewed_at: null as string | null,
  };
  let creates = 0,
    reconciles = 0,
    resolves = 0;
  await page.route('**/api/v1/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    const respond = (data: unknown, status = 200) =>
      route.fulfill({ status, json: { data, meta: { correlation_id: 'mock-only' } } });
    if (path === `/api/v1/trips/${trip}/fund`) return respond(fund);
    if (path.endsWith('/destinations')) return respond([]);
    if (req.method() === 'GET' && path.startsWith(`/api/v1/funds/${fundId}/`))
      return respond({
        items: path.endsWith('/contribution-requests')
          ? [requestRow]
          : path.endsWith('/contributions')
            ? [contribution]
            : path.endsWith('/payment-exceptions')
              ? [exception]
              : [],
        next_cursor: null,
      });
    if (path === `/api/v1/contributions/${id}/payment-attempts`) {
      creates++;
      expect(req.postDataJSON()).toEqual({
        provider: 'MOMO_SANDBOX',
        expected_version: 1,
        expected_finance_version: 1,
      });
      expect(req.headers()['idempotency-key']).toBeTruthy();
      return respond(attempt, 202);
    }
    if (path === `/api/v1/payment-attempts/${id}`) return respond(attempt);
    if (path.endsWith(`/payment-attempts/${id}/reconcile`)) {
      reconciles++;
      return respond(
        {
          operation_id: req.headers()['idempotency-key'],
          trip_id: trip,
          state: 'SUCCEEDED',
          outcome: { status: 'COMMITTED', blocking_ids: [] },
        },
        202,
      );
    }
    if (path.endsWith(`/payment-exceptions/${id}/resolve`)) {
      resolves++;
      expect(req.postDataJSON()).toMatchObject({
        resolution: 'LINKED',
        linked_attempt_id: id,
        previous_holder_transfer_confirmed: true,
      });
      exception.processing_status = 'PROCESSED';
      exception.reviewed_at = now;
      return respond(exception);
    }
    return route.fallback();
  });
  await login(page);
  await page.goto(`/trips/${trip}/fund`);
  const open = async () => {
    await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
    await page.getByRole('button', { name: 'MoMo & đối soát', exact: true }).click();
  };
  await open();
  await page.getByRole('button', { name: 'Tạo thanh toán MoMo Sandbox', exact: true }).click();
  await page
    .getByRole('button', { name: 'Xác nhận · Tạo thanh toán MoMo Sandbox', exact: true })
    .click();
  await expect(page.getByRole('link', { name: 'Mở MoMo Sandbox để thanh toán' })).toHaveAttribute(
    'href',
    attempt.payment_url,
  );
  await expect(
    page.getByRole('button', { name: 'Tạo thanh toán MoMo Sandbox', exact: true }),
  ).toBeDisabled();
  await page.reload();
  await open();
  await expect(page.getByRole('link', { name: 'Mở MoMo Sandbox để thanh toán' })).toBeVisible();
  expect(creates).toBe(1);
  await page.getByRole('button', { name: 'Yêu cầu đối soát', exact: true }).click();
  await page.getByLabel('Lý do đối soát', { exact: true }).fill('Kiểm tra Sandbox');
  await page.getByRole('button', { name: 'Xác nhận · Yêu cầu đối soát', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Liên kết thanh toán', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Liên kết thanh toán', exact: true }).click();
  await page.getByLabel('Lý do xử lý', { exact: true }).fill('Đã kiểm chứng chuyển tiền');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Xác nhận · Liên kết thanh toán', exact: true }).click();
  await expect(page.getByText('Đã xử lý', { exact: true })).toBeVisible();
  expect(reconciles).toBe(1);
  expect(resolves).toBe(1);
  for (const width of [1440, 768, 320, 402]) {
    await page.setViewportSize({ width, height: 850 });
    // A viewport resize can precede the browser's responsive layout update.
    // Retry a fresh measurement, retaining zero tolerance for horizontal overflow.
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), {
        message: `MoMo page horizontal overflow at ${width}px (excess pixels)`,
      })
      .toBeLessThanOrEqual(0);
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
    ).toEqual([]);
    await page.screenshot({ path: `test-results/payment-${width}.png` });
  }
  await page.screenshot({ path: 'test-results/payment-narrow.png', fullPage: true });
});
