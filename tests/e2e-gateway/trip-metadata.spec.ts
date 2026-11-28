import type { Route } from '@playwright/test';
import { test, expect } from './gateway-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';
const tripPath = `/trips/${tripId}`;
const apiPath = `/api/v1/trips/${tripId}`;
const labels = [
  'Tên chuyến đi',
  'Địa điểm',
  'Thành viên (hiện tại / tối đa)',
  'Ngày đi',
  'Ngày về',
  'Múi giờ',
  'Ngân sách chuyến đi',
  'Mô tả chuyến đi',
  'Mô tả công khai',
];

function respond(route: Route, data: unknown) {
  return route.fulfill({ json: { data, meta: { correlation_id: 'metadata-http-mock' } } });
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 960 },
  { name: 'mobile', width: 402, height: 874 },
]) {
  for (const owner of [true, false]) {
    test(`HTTP mock: metadata rows respect edit rights (${owner ? 'Owner' : 'Member'}, ${viewport.name})`, async ({
      page,
      gateway,
    }) => {
      gateway.authenticated = true;
      if (!owner) {
        gateway.trips[0]!.current_membership.role = 'MEMBER';
        gateway.trips[0]!.permissions.can_update = false;
      }
      await page.setViewportSize(viewport);
      await page.goto(`${tripPath}/settings?mode=settings`);
      const dialog = page.getByRole('dialog', { name: 'Chỉnh sửa thông tin', exact: true });
      const information = dialog.getByRole('region', {
        name: owner ? 'Chỉnh sửa thông tin chuyến đi' : 'Thông tin chuyến đi chỉ xem',
        exact: true,
      });
      await expect(information).toBeVisible();
      await expect(information.getByText('Thông tin chỉ xem', { exact: true })).toHaveCount(0);
      await expect(information.getByRole('textbox')).toHaveCount(0);
      const rows = labels.map((label) =>
        information.getByText(label, { exact: true }).locator('..').locator('..'),
      );
      const first = (await rows[0]!.boundingBox())!;
      const radius = await rows[0]!.evaluate((row) => getComputedStyle(row).borderRadius);
      for (const row of rows) {
        const box = (await row.boundingBox())!;
        expect(Math.abs(box.x - first.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.width - first.width)).toBeLessThanOrEqual(1);
        await expect(row).toHaveCSS('border-radius', radius);
      }
      for (const label of ['Địa điểm', 'Thành viên (hiện tại / tối đa)']) {
        const row = information.getByText(label, { exact: true }).locator('..').locator('..');
        await expect(row.locator('button, input, textarea, [tabindex]')).toHaveCount(0);
      }
      await expect(information.getByRole('button', { name: /^Chỉnh sửa / })).toHaveCount(
        owner ? 7 : 0,
      );
      await expect(dialog.getByLabel('Chọn ảnh bìa', { exact: true })).toHaveCount(owner ? 1 : 0);
      await expect(dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true })).toHaveCount(
        owner ? 1 : 0,
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        viewport.width,
      );
      expect(
        await information.evaluate((element) => {
          const content = element.parentElement!.parentElement!;
          return content.scrollWidth <= content.clientWidth;
        }),
      ).toBe(true);
      await page.screenshot({
        path: test
          .info()
          .outputPath(`trip-metadata-${owner ? 'owner' : 'member'}-${viewport.name}.png`),
      });
      if (owner) {
        await rows[3]!.evaluate((element) =>
          element.scrollIntoView({ block: 'start', inline: 'nearest' }),
        );
        await page.screenshot({
          path: test.info().outputPath(`trip-metadata-rows-${viewport.name}.png`),
        });
      }
      expect(
        gateway.calls.filter((call) => call.path === apiPath && call.method === 'PATCH'),
      ).toHaveLength(0);
    });
  }
}

test('HTTP mock: dates, timezone and budget keep their exact command after a lost response and reload', async ({
  page,
  gateway,
}) => {
  gateway.authenticated = true;
  const trip = gateway.trips[0]!;
  let budget = '5000000';
  const writes: { body: Record<string, unknown>; key: string }[] = [];
  await page.route(`**${apiPath}`, async (route) => {
    if (route.request().method() === 'GET')
      return respond(route, { ...trip, budget_amount: budget });
    if (route.request().method() !== 'PATCH') return route.fallback();
    const request = route.request();
    const body = request.postDataJSON() as Record<string, unknown>;
    const key = request.headers()['idempotency-key']!;
    expect(key).toBeTruthy();
    writes.push({ body, key });
    if (writes.length === 1) {
      expect(body).toEqual({
        start_at: '2026-11-01T04:00:00.000Z',
        end_at: '2026-11-04T05:00:00.000Z',
        timezone: 'America/New_York',
        budget_amount: '999999999999',
        expected_plan_version: 1,
        expected_export_revision: 1,
      });
      trip.start_at = String(body.start_at);
      trip.end_at = String(body.end_at);
      trip.timezone = String(body.timezone);
      budget = String(body.budget_amount);
      trip.plan_version += 1;
      trip.export_revision += 1;
      return route.abort('failed');
    }
    expect(writes[1]).toEqual(writes[0]);
    return respond(route, { ...trip, budget_amount: budget });
  });
  await page.goto(`${tripPath}/settings?mode=edit`);
  const dialog = page.getByRole('dialog', { name: 'Chỉnh sửa thông tin', exact: true });
  for (const label of ['ngày đi', 'ngày về', 'múi giờ', 'ngân sách chuyến đi'])
    await dialog.getByRole('button', { name: `Chỉnh sửa ${label}`, exact: true }).click();
  await dialog.getByLabel('Ngày đi', { exact: true }).fill('01/11/2026');
  await dialog.getByLabel('Ngày về', { exact: true }).fill('03/11/2026');
  await dialog.getByLabel('Múi giờ', { exact: true }).fill('America/New_York');
  await dialog.getByLabel('Ngân sách chuyến đi', { exact: true }).fill('999999999999');
  await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(dialog.getByText(/Chưa xác định được kết quả lưu/)).toBeVisible();
  await expect(dialog.getByLabel('Ngày đi', { exact: true })).toBeDisabled();
  await page.reload();
  await expect(dialog.getByLabel('Múi giờ', { exact: true })).toHaveValue('America/New_York');
  await expect(dialog.getByLabel('Ngày về', { exact: true })).toHaveValue('03/11/2026');
  await dialog.getByRole('button', { name: 'Thử lại đúng yêu cầu cũ', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(`${tripPath}/settings`);
  await page.getByRole('button', { name: 'Chỉnh sửa thông tin', exact: true }).click();
  const information = dialog.getByRole('region', {
    name: 'Chỉnh sửa thông tin chuyến đi',
    exact: true,
  });
  await expect(information.getByText('03/11/2026', { exact: true })).toBeVisible();
  await expect(information.getByText('999.999.999.999 ₫', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(2);
});

test('HTTP mock: range conflicts preserve the draft and allow a revised date range', async ({
  page,
  gateway,
}) => {
  gateway.authenticated = true;
  const trip = gateway.trips[0]!;
  const writes: { body: Record<string, unknown>; key: string }[] = [];
  await page.route(`**${apiPath}`, async (route) => {
    if (route.request().method() === 'GET') return respond(route, trip);
    if (route.request().method() !== 'PATCH') return route.fallback();
    const body = route.request().postDataJSON() as Record<string, unknown>;
    writes.push({ body, key: route.request().headers()['idempotency-key']! });
    if (writes.length === 1)
      return route.fulfill({
        status: 409,
        json: {
          error: {
            code: 'STATE_CONFLICT',
            message: 'Scheduled items fall outside the new trip range',
            retryable: false,
            details: { reason: 'TRIP_RANGE_CONFLICT', activity_count: 1 },
          },
          meta: { correlation_id: 'range-conflict-http-mock' },
        },
      });
    trip.end_at = String(body.end_at);
    trip.plan_version += 1;
    trip.export_revision += 1;
    return respond(route, trip);
  });
  await page.goto(`${tripPath}/settings?mode=edit`);
  const dialog = page.getByRole('dialog', { name: 'Chỉnh sửa thông tin', exact: true });
  await dialog.getByRole('button', { name: 'Chỉnh sửa ngày về', exact: true }).click();
  const end = dialog.getByLabel('Ngày về', { exact: true });
  await end.fill('02/11/2026');
  await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(
    dialog.getByText(/khiến hoạt động hoặc trang phục đã lên lịch nằm ngoài chuyến đi/),
  ).toBeVisible();
  await expect(end).toHaveValue('02/11/2026');
  await end.fill('04/11/2026');
  await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(writes).toHaveLength(2);
  expect(writes[1]!.key).not.toBe(writes[0]!.key);
  expect(writes.map((write) => write.body.end_at)).toEqual([
    '2026-11-02T17:00:00.000Z',
    '2026-11-04T17:00:00.000Z',
  ]);
});

test('HTTP mock: create sends the supported trip budget with inclusive dates', async ({
  page,
  gateway,
}) => {
  gateway.authenticated = true;
  let createdBody: Record<string, unknown> | null = null;
  await page.route('**/api/v1/trips', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON() as Record<string, unknown>;
    createdBody = body;
    expect(body).toEqual({
      name: 'Ngân sách chuyến đi mới',
      start_at: '2026-11-01T04:00:00.000Z',
      end_at: '2026-11-04T05:00:00.000Z',
      timezone: 'America/New_York',
      budget_amount: '999999999999',
      client_request_id: route.request().headers()['idempotency-key'],
    });
    return route.fulfill({
      status: 201,
      json: {
        data: { ...gateway.trips[0], name: body.name, budget_amount: body.budget_amount },
        meta: { correlation_id: 'trip-create-budget-http-mock' },
      },
    });
  });
  await page.goto('/trips/new');
  await page.getByLabel('Tên chuyến đi', { exact: true }).fill('Ngân sách chuyến đi mới');
  await page.getByLabel('Ngày đi', { exact: true }).fill('01/11/2026');
  await page.getByLabel('Ngày về', { exact: true }).fill('03/11/2026');
  await page.getByLabel('Múi giờ', { exact: true }).selectOption('__custom__');
  await page.getByLabel('Múi giờ IANA', { exact: true }).fill('America/New_York');
  const budget = page.getByLabel('Ngân sách dự kiến', { exact: true });
  const budgetBox = await budget.boundingBox();
  const membersBox = await page.getByRole('group', { name: 'Số thành viên dự kiến' }).boundingBox();
  expect(budgetBox!.x).toBeGreaterThan(membersBox!.x + membersBox!.width);
  expect(budgetBox!.y).toBeLessThan(membersBox!.y + membersBox!.height);
  await budget.fill('999999999999');
  await page.getByRole('button', { name: 'Tạo chuyến đi', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Chuyến đi đã sẵn sàng' })).toBeVisible();
  expect(createdBody).not.toBeNull();
});
