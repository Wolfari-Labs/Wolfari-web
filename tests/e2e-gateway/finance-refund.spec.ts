import { test, expect, login } from './gateway-fixture';
import AxeBuilder from '@axe-core/playwright';
const tripId = '11111111-1111-4111-8111-111111111111',
  fundId = '77777777-1111-4111-8111-111111111111',
  refundId = '22222222-2222-4222-8222-222222222222';
test('HTTP mock: refund create/report/nonreceipt/cancel and receipt/consent/reversal', async ({
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
  let row: Record<string, unknown> | null = null;
  const actions: string[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    const respond = (data: unknown, status = 200) =>
      route.fulfill({ status, json: { data, meta: { correlation_id: 'mock-only' } } });
    if (path === `/api/v1/trips/${tripId}/fund`) return respond(fund);
    if (path.endsWith('/destinations')) return respond([]);
    if (request.method() === 'GET' && path.startsWith(`/api/v1/funds/${fundId}/`))
      return respond({ items: path.endsWith('/refunds') && row ? [row] : [], next_cursor: null });
    if (
      request.method() === 'POST' &&
      (path.endsWith('/refunds') || path.startsWith(`/api/v1/refunds/${refundId}/`))
    ) {
      const body = request.postDataJSON();
      expect(body.expected_finance_version).toBe(fund.finance_version);
      if (path.endsWith('/refunds')) {
        row = {
          id: refundId,
          fund_id: fundId,
          member_user_id: body.member_user_id,
          amount: body.amount,
          reason: body.reason,
          status: 'PENDING',
          holder_reported_at: null,
          confirmed_at: null,
          nonreceipt_confirmed_at: null,
          reversal_requested_at: null,
          reversal_consented_at: null,
          created_at: '2026-11-12T00:00:00Z',
          updated_at: '2026-11-12T00:00:00Z',
          version: 1,
          finance_version: ++fund.finance_version,
        };
        return respond(row, 201);
      }
      expect(body.expected_version).toBe(row!.version);
      const action = path.split('/').at(-1)!;
      actions.push(action);
      const time = '2026-11-12T01:00:00Z';
      const changes: Record<string, Record<string, unknown>> = {
        'report-paid': { status: 'HOLDER_REPORTED', holder_reported_at: time },
        'confirm-nonreceipt': { nonreceipt_confirmed_at: time },
        cancel: { status: 'CANCELLED' },
        'confirm-received': { status: 'CONFIRMED', confirmed_at: time },
        'request-reversal': { reversal_requested_at: time },
        'consent-reversal': { reversal_consented_at: time },
        reverse: { status: 'REVERSED' },
      };
      if (action === 'reverse') expect(body.reason).toBe('Lý do đảo TEST');
      Object.assign(row!, changes[action], {
        version: Number(row!.version) + 1,
        finance_version: ++fund.finance_version,
      });
      return respond(row);
    }
    return route.fallback();
  });
  await login(page);
  await page.goto(`/trips/${tripId}/fund`);
  await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
  await page.getByRole('button', { name: 'Hoàn tiền', exact: true }).click();
  const run = async (label: string, reason?: string) => {
    await page.getByRole('button', { name: label, exact: true }).click();
    if (reason)
      await page
        .getByLabel(
          label === 'Đảo hoàn tiền' ? 'Nhập lại đúng lý do đã yêu cầu đảo' : 'Lý do thao tác',
          { exact: true },
        )
        .fill(reason);
    await page.getByRole('button', { name: 'Xác nhận · ' + label, exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Xác nhận · ' + label, exact: true }),
    ).toHaveCount(0);
  };
  const create = async () => {
    await page.getByRole('button', { name: 'Tạo phương án hoàn tiền', exact: true }).click();
    await page.getByLabel('Người nhận hoàn tiền').selectOption(gateway.profile.id);
    await page.getByLabel('Số tiền hoàn VND').fill('100000');
    await page.getByLabel('Lý do hoàn tiền', { exact: true }).fill('Dư quỹ');
    await page.getByRole('button', { name: 'Xác nhận · Tạo phương án hoàn tiền' }).click();
  };
  await create();
  await run('Báo đã hoàn TEST');
  await run('Báo chưa nhận hoàn tiền', 'Chưa thấy tiền');
  await expect(page.getByText(/Web không tự giải phóng khoản giữ/)).toBeVisible();
  await run('Hủy hoàn tiền', 'Đã đối chiếu');
  await create();
  await run('Báo đã hoàn TEST');
  await run('Xác nhận nhận hoàn tiền');
  await run('Yêu cầu đảo hoàn tiền', 'Lý do đảo TEST');
  await run('Đồng ý đảo hoàn tiền');
  await page.reload();
  await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
  await page.getByRole('button', { name: 'Hoàn tiền', exact: true }).click();
  await run('Đảo hoàn tiền', 'Lý do đảo TEST');
  await expect(page.getByRole('article').getByText('Đã đảo', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 402, height: 850 });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  expect(actions).toEqual([
    'report-paid',
    'confirm-nonreceipt',
    'cancel',
    'report-paid',
    'confirm-received',
    'request-reversal',
    'consent-reversal',
    'reverse',
  ]);
});
