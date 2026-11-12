import { test, expect, login } from './gateway-fixture';
import {
  closureFixture,
  closureFund as fundId,
  closureTrip as tripId,
  closureId,
} from '../finance-closure-fixture';
import AxeBuilder from '@axe-core/playwright';
test('HTTP mock: closure snapshot detail, reminder accepted, cancel and final confirmation', async ({
  page,
  gateway,
}) => {
  const fund = {
    id: fundId,
    trip_id: tripId,
    holder_user_id: gateway.profile.id,
    currency: 'VND',
    budget_amount: null,
    current_balance: '0',
    reserved_refund: '0',
    available_balance: '0',
    status: 'OPEN',
    finance_version: 1,
    closed_at: null as string | null,
  };
  let row: ReturnType<typeof closureFixture> | null = null;
  let confirms = 0;
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    const respond = (data: unknown, status = 200) =>
      route.fulfill({ status, json: { data, meta: { correlation_id: 'mock-only' } } });
    if (path === `/api/v1/trips/${tripId}/fund`) return respond(fund);
    if (path.endsWith('/destinations')) return respond([]);
    if (request.method() === 'GET' && path === `/api/v1/closures/${closureId}`) return respond(row);
    if (request.method() === 'GET' && path.startsWith(`/api/v1/funds/${fundId}/`))
      return respond({ items: path.endsWith('/closures') && row ? [row] : [], next_cursor: null });
    if (request.method() === 'POST' && path.endsWith('/closures')) {
      expect(request.postDataJSON()).toEqual({ expected_finance_version: fund.finance_version });
      row = closureFixture(gateway.profile.id);
      fund.finance_version++;
      fund.status = 'CLOSING';
      row.finance_version = fund.finance_version;
      row.snapshot_finance_version = fund.finance_version;
      row.snapshot.fund.finance_version = fund.finance_version;
      return respond(row, 201);
    }
    if (request.method() === 'POST' && path.startsWith(`/api/v1/closures/${closureId}/`)) {
      if (path.endsWith('/remind')) {
        expect(request.postDataJSON()).toEqual({});
        return respond(
          {
            accepted: true,
            operation_id: request.headers()['idempotency-key'],
            closure_id: closureId,
          },
          202,
        );
      }
      const now = '2026-11-12T01:00:00Z';
      if (path.endsWith('/cancel')) {
        expect(request.postDataJSON()).toEqual({ reason: 'Kiểm tra lại' });
        Object.assign(row!, {
          status: 'CANCELLED',
          cancelled_at: now,
          cancelled_reason: 'Kiểm tra lại',
        });
        fund.status = 'OPEN';
      } else {
        expect(request.postDataJSON()).toEqual({ snapshot_hash: row!.snapshot_hash });
        confirms++;
        row!.confirmations[0]!.confirmed_at = now;
        row!.status = 'COMPLETED';
        row!.closed_at = now;
        fund.status = 'CLOSED';
        fund.closed_at = now;
      }
      row!.finance_version = ++fund.finance_version;
      return respond(row);
    }
    return route.fallback();
  });
  await login(page);
  await page.goto(`/trips/${tripId}/fund`);
  await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
  await page.getByRole('button', { name: 'Đóng Finance', exact: true }).click();
  const run = async (label: string, reason?: string) => {
    await page.getByRole('button', { name: label, exact: true }).click();
    if (reason) await page.getByLabel('Lý do hủy đợt chốt').fill(reason);
    await page.getByRole('button', { name: 'Xác nhận · ' + label, exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Xác nhận · ' + label, exact: true }),
    ).toHaveCount(0);
  };
  await run('Bắt đầu chốt quỹ');
  await page.getByRole('button', { name: /Xem snapshot/ }).click();
  await expect(page.getByRole('button', { name: 'Xác nhận snapshot', exact: true })).toBeDisabled();
  await run('Yêu cầu nhắc xác nhận');
  await expect(
    page.getByText('Yêu cầu nhắc được tiếp nhận không đồng nghĩa thông báo đã được giao.'),
  ).toBeVisible();
  await run('Hủy đợt chốt', 'Kiểm tra lại');
  await run('Bắt đầu chốt quỹ');
  await page.getByRole('button', { name: /Xem snapshot/ }).click();
  await page.getByRole('checkbox').check();
  await run('Xác nhận snapshot');
  await expect(
    page.getByRole('region', { name: 'Đợt chốt quỹ', exact: true }).getByText(/Finance CLOSED/),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận snapshot', exact: true })).toHaveCount(0);
  expect(confirms).toBe(1);
  await page.setViewportSize({ width: 402, height: 850 });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
});
