import { test, expect, login } from './gateway-fixture';
const tripId = '11111111-1111-4111-8111-111111111111',
  fundId = '77777777-1111-4111-8111-111111111111',
  contributionId = '22222222-2222-4222-8222-222222222222';
for (const holder of [true, false])
  test(`HTTP mock: contribution reversal Holder=${holder}`, async ({ page, gateway }) => {
    const fund = {
      id: fundId,
      trip_id: tripId,
      holder_user_id: holder ? gateway.profile.id : contributionId,
      currency: 'VND',
      budget_amount: null,
      current_balance: '500000',
      reserved_refund: '0',
      available_balance: '500000',
      status: 'OPEN',
      finance_version: 2,
      closed_at: null,
    };
    const contribution = {
      id: contributionId,
      fund_id: fundId,
      request_id: tripId,
      member_user_id: gateway.profile.id,
      amount: '100000',
      status: 'CONFIRMED',
      self_contribution: false,
      version: 2,
      finance_version: 2,
      member_reported_at: null,
      confirmed_at: '2026-11-12T00:00:00Z',
      confirmed_by_user_id: gateway.profile.id,
      waived_reason: null,
      cancelled_reason: null,
      rejected_reason: null,
    };
    let writes = 0;
    await page.route('**/api/v1/**', async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
      const respond = (data: unknown) =>
        route.fulfill({ json: { data, meta: { correlation_id: 'mock-only' } } });
      if (path === `/api/v1/trips/${tripId}/fund`) return respond(fund);
      if (path.endsWith('/destinations')) return respond([]);
      if (path === `/api/v1/contributions/${contributionId}/reverse`) {
        writes++;
        expect(request.postDataJSON()).toEqual({
          reason: 'Ghi nhầm khoản đóng',
          expected_version: 2,
          expected_finance_version: 2,
        });
        expect(request.headers()['idempotency-key']).toBeTruthy();
        Object.assign(contribution, { status: 'REVERSED', version: 3, finance_version: 3 });
        Object.assign(fund, {
          current_balance: '400000',
          available_balance: '400000',
          finance_version: 3,
        });
        return respond(contribution);
      }
      if (path.startsWith(`/api/v1/funds/${fundId}/`))
        return respond({
          items: path.endsWith('/contributions') ? [contribution] : [],
          next_cursor: null,
        });
      return route.fallback();
    });
    await login(page);
    await page.goto(`/trips/${tripId}/fund`);
    await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
    await page.getByRole('button', { name: 'Đợt đóng góp', exact: true }).click();
    const reverse = page.getByRole('button', { name: 'Đảo khoản đóng', exact: true });
    if (!holder) {
      await expect(reverse).toHaveCount(0);
      expect(writes).toBe(0);
      return;
    }
    await reverse.click();
    await page.getByLabel('Lý do đảo khoản đóng').fill('Ghi nhầm khoản đóng');
    await page.getByRole('button', { name: 'Xác nhận · Đảo khoản đóng' }).click();
    await expect(reverse).toHaveCount(0);
    await expect(page.getByTestId('contribution-' + gateway.profile.id)).toContainText('Đã đảo');
    expect(writes).toBe(1);
    expect(fund.current_balance).toBe('400000');
  });
