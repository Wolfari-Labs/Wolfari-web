import { test, expect, login } from './gateway-fixture';
import AxeBuilder from '@axe-core/playwright';
const tripId = '11111111-1111-4111-8111-111111111111',
  fundId = '77777777-1111-4111-8111-111111111111',
  refundId = '22222222-2222-4222-8222-222222222222',
  verifierId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
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
        'assign-verifier': {
          verifier_user_id: body.verifier_user_id,
          verifier_assigned_by_user_id: gateway.profile.id,
          verifier_assigned_at: time,
        },
        'request-reversal': { reversal_requested_at: time, reversal_reason: body.reason },
        'consent-reversal': { reversal_consented_at: time },
        reverse: { status: 'REVERSED' },
      };
      if (action === 'reverse') expect(body.reason).toBe('Lý do đảo TEST');
      if (action === 'assign-verifier') expect(body.verifier_user_id).toBe(verifierId);
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
    if (reason) await page.getByLabel('Lý do thao tác', { exact: true }).fill(reason);
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
  await run('Báo đã hoàn tiền');
  await run('Báo chưa nhận hoàn tiền', 'Chưa thấy tiền');
  await expect(page.getByText(/Web không tự giải phóng khoản giữ/)).toBeVisible();
  await run('Hủy hoàn tiền', 'Đã đối chiếu');
  await create();
  await run('Báo đã hoàn tiền');
  // Current Holder does not identify the historical payer after a handover. The UI
  // offers candidates; the backend still enforces independent verification.
  await expect(page.getByRole('button', { name: 'Xác nhận nhận hoàn tiền' })).toBeVisible();
  await expect(page.getByText(/Hệ thống kiểm tra quyền theo người đã trả tiền/)).toBeVisible();
  await page.getByRole('button', { name: 'Chỉ định người kiểm chứng', exact: true }).click();
  await page.getByLabel('Người kiểm chứng', { exact: true }).selectOption(verifierId);
  await page
    .getByRole('button', { name: 'Xác nhận · Chỉ định người kiểm chứng', exact: true })
    .click();
  await expect(page.getByText(/Người kiểm chứng được chỉ định: Member Gateway./)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận nhận hoàn tiền' })).toBeVisible();
  // The assigned member confirms in their own session; mirror the backend result.
  Object.assign(row!, {
    status: 'CONFIRMED',
    confirmed_at: '2026-11-12T02:00:00Z',
    confirmed_by_user_id: verifierId,
    confirmation_mode: 'ASSIGNED_MEMBER',
    independent_verification: true,
    version: Number(row!.version) + 1,
    finance_version: ++fund.finance_version,
  });
  await page.reload();
  await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
  await page.getByRole('button', { name: 'Hoàn tiền', exact: true }).click();
  await expect(page.getByText(/Thành viên được chỉ định kiểm chứng độc lập/)).toBeVisible();
  await run('Yêu cầu đảo hoàn tiền', 'Lý do đảo TEST');
  await run('Đồng ý đảo hoàn tiền');
  await page.reload();
  await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
  await page.getByRole('button', { name: 'Hoàn tiền', exact: true }).click();
  // BE-04: the reversal reason comes back from the API and is prefilled.
  await page.getByRole('button', { name: 'Đảo hoàn tiền', exact: true }).click();
  await expect(page.getByLabel('Lý do đảo (đã yêu cầu trước đó)')).toHaveValue('Lý do đảo TEST');
  await expect(page.getByLabel('Lý do đảo (đã yêu cầu trước đó)')).toHaveAttribute('readonly', '');
  await page.getByRole('button', { name: 'Xác nhận · Đảo hoàn tiền', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Xác nhận · Đảo hoàn tiền', exact: true }),
  ).toHaveCount(0);
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
    'assign-verifier',
    'request-reversal',
    'consent-reversal',
    'reverse',
  ]);
});
