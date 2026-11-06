import { test, expect, login } from './gateway-fixture';
import {
  activitiesForDay,
  expectClearedTimes,
  expectDayOrder,
  expectOriginalTimes,
  firstDay,
  handle,
  list,
  openPool,
  originalIds,
  pointAt,
  pointerDrop,
  poolId,
  row,
  secondDay,
  seedPlan,
  tripId,
} from './plan-dnd-fixture';

test('HTTP mock: timed cross-day drag clears the moved time without an editor; explicit editing retains conflict safeguards', async ({
  page,
  gateway,
}) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  const mock = await seedPlan(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  await pointerDrop(
    page,
    handle(page, originalIds[0]!),
    page.getByRole('button', { name: 'Ngày 2 · 02/11', exact: true }),
    'middle',
    false,
  );
  await page.getByRole('button', { name: 'Ngày 2 · 02/11', exact: true }).click();
  await expectDayOrder(page, mock, [originalIds[0]!], secondDay);
  expectClearedTimes(activitiesForDay(mock, secondDay), secondDay);
  activitiesForDay(mock, firstDay).forEach(expectOriginalTimes);
  await row(page, originalIds[0]!).getByRole('button', { name: 'Thao tác Đi dạo' }).click();
  await page.getByRole('menuitem', { name: 'Chỉnh sửa hoạt động' }).click();
  const dialog = page.getByRole('dialog', { name: 'Chỉnh sửa hoạt động' });
  await dialog.getByLabel('Tên hoạt động', { exact: true }).fill('Giữ nội dung nhập');
  mock.controls.conflictNext = true;
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(dialog.getByText(/Lịch trình đã thay đổi/)).toBeVisible();
  await expect(dialog.getByLabel('Tên hoạt động', { exact: true })).toHaveValue(
    'Giữ nội dung nhập',
  );
  await expect(dialog.getByRole('button', { name: 'Lưu', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  mock.controls.forbidden = true;
  await page.reload();
  await expect(page.locator('[data-gateway-handle]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Thêm hoạt động', exact: true })).toHaveCount(0);
});

test('HTTP mock: keyboard commits only on Enter, returns focus and supports pool transfers plus split resize', async ({
  page,
  gateway,
}) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  const mock = await seedPlan(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  const [a, b, c, d] = originalIds as [string, string, string, string];
  await handle(page, a).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  expect(mock.writes).toEqual([]);
  await page.keyboard.press('Escape');
  expect(mock.writes).toEqual([]);
  await expect(handle(page, a)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expectDayOrder(page, mock, [b, c, a, d]);
  activitiesForDay(mock, firstDay).slice(0, 2).forEach(expectOriginalTimes);
  expectClearedTimes(activitiesForDay(mock, firstDay).slice(2));
  await expect(handle(page, a)).toBeFocused();
  await openPool(page);
  const before = mock.writes.length;
  await handle(page, poolId).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  expect(mock.writes).toHaveLength(before);
  await expect(list(page)).toHaveAttribute('data-insertion-slot', '2');
  await page.keyboard.press('Enter');
  await expectDayOrder(page, mock, [b, c, poolId, a, d]);
  await expect(handle(page, poolId)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expectDayOrder(page, mock, [b, c, a, d]);
  expectClearedTimes([mock.activities.find((activity) => activity.id === poolId)!], null);
  await expect(handle(page, poolId)).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const separator = page.getByRole('separator', { name: 'Đổi chiều rộng lịch trình' });
  await separator.focus();
  const beforeResize = await separator.getAttribute('aria-valuenow');
  await page.keyboard.press('ArrowLeft');
  await expect(separator).not.toHaveAttribute('aria-valuenow', beforeResize!);
  await separator.press('Home');
  await expect(separator).toHaveAttribute('aria-valuenow', '58.219');
});

test('HTTP mock: keyboard selected-location transfer creates at the chosen slot and restores activity focus', async ({
  page,
  gateway,
}) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  const mock = await seedPlan(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  await openPool(page);
  const place = handle(page, '66666666-1111-4111-8111-111111111111', 'location');
  await place.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  expect(mock.writes).toEqual([]);
  await page.keyboard.press('Enter');
  await expect
    .poll(
      () =>
        mock.activities.filter(
          (activity) => activity.selected_location_id === '66666666-1111-4111-8111-111111111111',
        ).length,
    )
    .toBe(1);
  const created = mock.activities.find(
    (activity) => activity.selected_location_id === '66666666-1111-4111-8111-111111111111',
  )!;
  await expectDayOrder(page, mock, [
    ...originalIds.slice(0, 2),
    created.id,
    ...originalIds.slice(2),
  ]);
  const create = mock.writes.find((write) => write.method === 'POST')!;
  expect(create.body).toMatchObject({
    selected_location_id: '66666666-1111-4111-8111-111111111111',
    scheduled_date: firstDay,
    starts_at: null,
    ends_at: null,
  });
  expect(mock.activities.find((activity) => activity.id === created.id)!.position).toBe(2);
  expect(mock.writes.filter((write) => write.method === 'POST')).toHaveLength(1);
  await expect(handle(page, created.id)).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(list(page, 'POOL')).toBeVisible();
});

test('HTTP mock: CDP touch sorting resets the same suffix without opening a form', async ({
  page,
  gateway,
}) => {
  await page.setViewportSize({ width: 820, height: 1400 });
  const mock = await seedPlan(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  const [a, b, c, d] = originalIds as [string, string, string, string];
  await pointAt(row(page, c), 'after');
  const start = await pointAt(handle(page, a));
  const endBox = await row(page, c).boundingBox();
  expect(endBox).not.toBeNull();
  const end = { x: endBox!.x + endBox!.width / 2, y: endBox!.y + endBox!.height * 0.8 };
  const cdp = await page.context().newCDPSession(page);
  const point = (x: number, y: number) => ({ x, y, id: 1, radiusX: 5, radiusY: 5, force: 1 });
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await page.evaluate(() => {
      (window as Window & { __touchTrace?: string[] }).__touchTrace = [];
      for (const type of [
        'touchstart',
        'touchmove',
        'touchend',
        'pointerdown',
        'pointermove',
        'pointerup',
      ])
        window.addEventListener(
          type,
          (event) => {
            const pointer = event as PointerEvent;
            const touch = event as TouchEvent;
            (window as Window & { __touchTrace?: string[] }).__touchTrace!.push(
              type + ':' + (pointer.pointerType ?? '') + ':' + (touch.touches?.length ?? -1),
            );
          },
          { capture: true },
        );
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [point(start.x, start.y)],
    });
    await page.waitForTimeout(350);
    for (let step = 1; step <= 16; step++)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          point(
            start.x + ((end.x - start.x) * step) / 16,
            start.y + ((end.y - start.y) * step) / 16,
          ),
        ],
      });
    await expect(handle(page, a)).toHaveAttribute('aria-pressed', 'true');
    await expect(list(page)).toHaveAttribute('data-insertion-slot', '2');
    const trace = await page.evaluate(
      () => (window as Window & { __touchTrace?: string[] }).__touchTrace,
    );
    expect(trace, 'The browser must deliver real touch/pointer input to the plan').toEqual(
      expect.arrayContaining([
        'touchstart::1',
        'touchmove::1',
        'pointerdown:touch:-1',
        'pointermove:touch:-1',
      ]),
    );
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await cdp
      .send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
      .catch(() => {});
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await cdp.detach();
  }
  await expectDayOrder(page, mock, [b, c, a, d]);
  activitiesForDay(mock, firstDay).slice(0, 2).forEach(expectOriginalTimes);
  expectClearedTimes(activitiesForDay(mock, firstDay).slice(2));
  await expect(handle(page, a)).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('HTTP mock: compact planner keeps pool and timeline usable and restores Add focus on Escape', async ({
  page,
  gateway,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  const mock = await seedPlan(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  const trigger = page.getByRole('button', { name: 'Thêm hoạt động', exact: true });
  await openPool(page);
  const sheet = page.getByRole('dialog', { name: 'Sắp xếp lịch trình', exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator(`[data-gateway-list="${firstDay}"]`)).toBeVisible();
  await expect(sheet.locator('[data-gateway-list="POOL"]')).toBeVisible();
  await handle(page, poolId).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expectDayOrder(page, mock, [poolId, ...originalIds]);
  await expect(sheet).toBeVisible();
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
