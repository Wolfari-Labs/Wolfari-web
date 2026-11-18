import { type Page, type Locator } from '@playwright/test';
import { test, expect, login } from './gateway-fixture';
import { mockPlan } from './plan-fixture';
const tripId = '11111111-1111-4111-8111-111111111111';
async function drag(page: Page, from: Locator, to: Locator) {
  await from.scrollIntoViewIfNeeded();
  const a = (await from.boundingBox())!,
    b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 4 });
  await expect(page.locator('[data-dragging=true]')).toHaveCount(1);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 16 });
  await page.mouse.up();
}
test('Gateway drag saves one PATCH with Trip-wide position, cancels safely and moves across days', async ({
  page,
  gateway,
}) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  const mock = await mockPlan(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  const handle = page.getByRole('button', { name: 'Kéo hoạt động Đi dạo' });
  await handle.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  expect(mock.writes).toHaveLength(0);
  await drag(page, handle, page.getByRole('listitem', { name: 'Ăn sáng', exact: true }));
  await expect.poll(() => mock.writes.length).toBe(1);
  // Same group: one PATCH carrying only the new Trip-wide position.
  expect(mock.writes[0]!.method).toBe('PATCH');
  expect(mock.writes[0]!.body).toEqual({ expected_plan_version: 1, position: 1 });
  await expect(page.locator('[data-day-list="POOL"] [data-plan-activity]').first()).toHaveAttribute(
    'aria-label',
    'Ăn sáng',
  );
  await drag(page, handle, page.getByRole('button', { name: 'Ngày 1 · 01/11', exact: true }));
  await expect.poll(() => mock.writes.length).toBe(2);
  // Another day: still one PATCH; day and order travel together.
  expect(mock.writes[1]!.method).toBe('PATCH');
  expect(mock.writes[1]!.body).toEqual({
    expected_plan_version: 2,
    scheduled_date: '2026-11-01',
    position: 0,
  });
  await expect(page.locator('[data-day-list="2026-11-01"] [data-plan-activity]')).toHaveAttribute(
    'aria-label',
    'Đi dạo',
  );
  expect(mock.writes.some((write) => write.method === 'PUT')).toBe(false);
  await page.reload();
  await expect(page.locator('[data-day-list="2026-11-01"] [data-plan-activity]')).toHaveAttribute(
    'aria-label',
    'Đi dạo',
  );
});
test('Gateway timed drag is blocked with a detail path; a conflict keeps the draft and revoked rights block writes', async ({
  page,
  gateway,
}) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  const mock = await mockPlan(page, gateway);
  Object.assign(mock.activities[0]!, {
    starts_at: '2026-11-01T03:00:00Z',
    ends_at: '2026-11-01T04:00:00Z',
  });
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  await drag(
    page,
    page.getByRole('button', { name: 'Kéo hoạt động Đi dạo' }),
    page.getByRole('button', { name: 'Ngày 2 · 02/11', exact: true }),
  );
  await expect(page.getByText(/Hoạt động có giờ cố định — sửa giờ trong chi tiết/)).toBeVisible();
  expect(mock.writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Mở chi tiết', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Chỉnh sửa hoạt động' });
  await expect(dialog).toBeVisible();
  expect(mock.writes).toHaveLength(0);
  await expect(dialog.getByLabel('Ngày bắt đầu hoặc ngày chưa có giờ')).toHaveValue('2026-11-02');
  await expect(dialog.getByLabel('Giờ bắt đầu', { exact: true })).toHaveValue('10:00');
  await dialog.getByLabel('Ngày kết thúc (nếu có giờ)').fill('2026-11-02');
  mock.controls.conflictNext = true;
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(dialog.getByText(/Lịch trình đã thay đổi/)).toBeVisible();
  await expect(dialog.getByLabel('Giờ bắt đầu', { exact: true })).toHaveValue('10:00');
  await expect(dialog.getByRole('button', { name: 'Lưu', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  mock.controls.forbidden = true;
  await page.reload();
  await expect(page.getByRole('button', { name: 'Kéo hoạt động Đi dạo' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Thêm hoạt động' })).toHaveCount(0);
  expect(mock.writes).toHaveLength(1);
});
test('Gateway keyboard drag and split resize remain operable without a mouse', async ({
  page,
  gateway,
}) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  const mock = await mockPlan(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  const handle = page.getByRole('button', { name: 'Kéo hoạt động Đi dạo' });
  await handle.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(() => mock.writes.length).toBe(1);
  expect(mock.writes[0]!.method).toBe('PATCH');
  expect(mock.writes[0]!.body).toMatchObject({ position: 1 });
  await page.getByRole('button', { name: 'Sắp xếp lịch trình' }).click();
  const separator = page.getByRole('separator', { name: 'Đổi chiều rộng lịch trình' });
  await separator.focus();
  const before = await separator.getAttribute('aria-valuenow');
  await page.keyboard.press('ArrowLeft');
  await expect(separator).not.toHaveAttribute('aria-valuenow', before!);
  await page.getByRole('button', { name: 'Khôi phục tỷ lệ panel' }).click();
  await expect(separator).toHaveAttribute('aria-valuenow', '62');
});
test('Gateway touch drag uses the same reorder contract', async ({ page, gateway }) => {
  await page.setViewportSize({ width: 820, height: 1400 });
  const mock = await mockPlan(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  const handle = page.getByRole('button', { name: 'Kéo hoạt động Đi dạo' });
  const target = page.getByRole('listitem', { name: 'Ăn sáng', exact: true });
  // Day groups put the pool lower on the page; keep the gesture away from auto-scroll edges.
  await target.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const a = (await handle.boundingBox())!,
    b = (await target.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const point = (x: number, y: number) => ({ x, y, id: 1, radiusX: 5, radiusY: 5, force: 1 });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [point(a.x + a.width / 2, a.y + a.height / 2)],
  });
  // Touch sensor uses a press delay to distinguish scrolling from dragging.
  await page.waitForTimeout(350);
  for (let i = 1; i <= 14; i++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        point(
          a.x + a.width / 2 + ((b.x + b.width / 2 - a.x - a.width / 2) * i) / 14,
          a.y + a.height / 2 + ((b.y + b.height / 2 - a.y - a.height / 2) * i) / 14,
        ),
      ],
    });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await expect.poll(() => mock.writes.length).toBe(1);
  expect(mock.writes[0]!.method).toBe('PATCH');
  expect(mock.writes[0]!.body).toMatchObject({ position: 1 });
});
test('Gateway compact organizer uses a sheet with Escape and restored focus', async ({
  page,
  gateway,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await mockPlan(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  await page.getByRole('button', { name: 'Sắp xếp lịch trình' }).click();
  const trigger = page.getByRole('button', { name: 'Hoạt động chưa xếp ngày', exact: true });
  await trigger.click();
  const sheet = page.getByRole('dialog', { name: 'Hoạt động chưa xếp ngày', exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('listitem', { name: 'Đi dạo', exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect(sheet).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
    .not.toBe('hidden');
});
