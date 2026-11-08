import { expect, login, test } from './gateway-fixture';
import {
  activitiesForDay,
  expectClearedTimes,
  expectDayOrder,
  expectOriginalTimes,
  firstDay,
  handle,
  list,
  locationId,
  openPool,
  originalIds,
  pointAt,
  pointerDrop,
  poolId,
  row,
  secondDay,
  seedPlan,
  startPointer,
  tripId,
} from './plan-dnd-fixture';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
});

test('HTTP mock: repeated pointer sorting works with pool closed, resets suffix, persists server state without opening editor', async ({
  page,
  gateway,
}) => {
  const mock = await seedPlan(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  const [a, b, c, d] = originalIds as [string, string, string, string];
  await expect(list(page, 'POOL')).toHaveCount(0);
  await pointerDrop(page, handle(page, a), row(page, c), 'after');
  await expectDayOrder(page, mock, [b, c, a, d]);
  activitiesForDay(mock, firstDay).slice(0, 2).forEach(expectOriginalTimes);
  expectClearedTimes(activitiesForDay(mock, firstDay).slice(2));
  await expect(handle(page, a)).toBeFocused();

  await pointerDrop(page, handle(page, a), row(page, b), 'before');
  await expectDayOrder(page, mock, [a, b, c, d]);
  expectClearedTimes(activitiesForDay(mock, firstDay));
  await pointerDrop(page, handle(page, a), list(page).locator('[data-gateway-drop-end]'));
  await expectDayOrder(page, mock, [b, c, d, a]);
  await expect(handle(page, a)).toBeFocused();
  expect(mock.writes.filter((write) => write.method === 'PUT')).toHaveLength(3);
  for (const write of mock.writes.filter((write) => write.method === 'PUT'))
    expect([...(write.body.activity_ids as string[])].sort()).toEqual(
      [...originalIds, poolId].sort(),
    );
  expect(new Set(mock.writes.map((write) => write.key)).size).toBe(mock.writes.length);
  await page.reload();
  await expectDayOrder(page, mock, [b, c, d, a]);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const insertion of [
  { name: 'first', index: 0 },
  { name: 'middle', index: 2 },
  { name: 'end', index: 4 },
]) {
  test(`HTTP mock: existing pool activity inserts at ${insertion.name}, keeping prefix times and clearing suffix`, async ({
    page,
    gateway,
  }) => {
    const mock = await seedPlan(page, gateway);
    await login(page);
    await page.goto(`/trips/${tripId}/plan`);
    await openPool(page);
    const target =
      insertion.index === 4
        ? list(page).locator('[data-gateway-drop-end]')
        : row(page, originalIds[insertion.index]!);
    await pointerDrop(
      page,
      handle(page, poolId),
      target,
      insertion.index === 4 ? 'middle' : 'before',
    );
    const ids = [...originalIds];
    ids.splice(insertion.index, 0, poolId);
    await expectDayOrder(page, mock, ids);
    activitiesForDay(mock, firstDay).slice(0, insertion.index).forEach(expectOriginalTimes);
    expectClearedTimes(activitiesForDay(mock, firstDay).slice(insertion.index));
    await expect(list(page, 'POOL')).toBeVisible();
    await expect(handle(page, poolId)).toBeFocused();
    await expect(row(page, poolId).getByText('Chưa xếp giờ', { exact: true })).toBeVisible();
    expect(mock.writes.some((write) => write.method === 'POST')).toBe(false);
    await page.reload();
    await expectDayOrder(page, mock, ids);
  });
}

test('HTTP mock: a selected location becomes one real server activity at the requested slot and can return to pool', async ({
  page,
  gateway,
}) => {
  const mock = await seedPlan(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  await openPool(page);
  await pointerDrop(
    page,
    handle(page, locationId, 'location'),
    row(page, originalIds[2]!),
    'before',
  );
  await expect
    .poll(
      () =>
        mock.activities.filter((activity) => activity.selected_location_id === locationId).length,
    )
    .toBe(1);
  const created = mock.activities.find((activity) => activity.selected_location_id === locationId)!;
  await expectDayOrder(page, mock, [
    ...originalIds.slice(0, 2),
    created.id,
    ...originalIds.slice(2),
  ]);
  activitiesForDay(mock, firstDay).slice(0, 2).forEach(expectOriginalTimes);
  expectClearedTimes(activitiesForDay(mock, firstDay).slice(2));
  expect(mock.writes.filter((write) => write.method === 'POST')).toHaveLength(1);
  expect(mock.writes.find((write) => write.method === 'POST')!.body).toMatchObject({
    selected_location_id: locationId,
    title: 'Địa điểm mới',
    scheduled_date: firstDay,
    starts_at: null,
    ends_at: null,
  });
  await expect(handle(page, locationId, 'location')).toHaveCount(0);
  const beforeReturn = structuredClone(
    mock.activities.filter((activity) => activity.id !== created.id),
  );
  await pointerDrop(
    page,
    handle(page, created.id),
    list(page, 'POOL').locator('[data-gateway-drop-end]'),
  );
  await expectDayOrder(page, mock, originalIds);
  expectClearedTimes([mock.activities.find((activity) => activity.id === created.id)!], null);
  for (const original of beforeReturn) {
    const actual = mock.activities.find((activity) => activity.id === original.id)!;
    expect(actual).toMatchObject({
      starts_at: original.starts_at,
      ends_at: original.ends_at,
      scheduled_date: original.scheduled_date,
    });
  }
  await expect(handle(page, locationId, 'location')).toHaveCount(0);
  await expect(handle(page, created.id)).toBeFocused();
});

test('HTTP mock: drop into empty day preserves all other dates and does not open a form', async ({
  page,
  gateway,
}) => {
  const mock = await seedPlan(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  await page.getByRole('button', { name: 'Ngày 2 · 02/11', exact: true }).click();
  await openPool(page);
  await pointerDrop(
    page,
    handle(page, poolId),
    list(page, secondDay).locator('[data-gateway-drop-end]'),
  );
  await expectDayOrder(page, mock, [poolId], secondDay);
  expectClearedTimes(activitiesForDay(mock, secondDay), secondDay);
  activitiesForDay(mock, firstDay).forEach(expectOriginalTimes);
  await expect(list(page, 'POOL')).toBeVisible();
  await expect(handle(page, poolId)).toBeFocused();
});

test('HTTP mock: self-drop, Escape and outside drop preserve all timestamps and issue no writes', async ({
  page,
  gateway,
}) => {
  const mock = await seedPlan(page, gateway);
  const before = structuredClone(mock.activities);
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  const a = originalIds[0]!;
  await startPointer(page, handle(page, a));
  let target = await pointAt(row(page, a), 'before');
  await page.mouse.move(target.x, target.y, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('[data-dragging="true"]')).toHaveCount(0);
  expect(mock.writes).toEqual([]);
  await expect(handle(page, a)).toBeFocused();

  await startPointer(page, handle(page, a));
  target = await pointAt(row(page, originalIds[2]!), 'after');
  await page.mouse.move(target.x, target.y, { steps: 10 });
  await expect(list(page)).toHaveAttribute('data-insertion-slot', /\d+/);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('[data-gateway-list][data-insertion-slot]')).toHaveCount(0);
  await expect(handle(page, a)).toBeFocused();
  expect(mock.writes).toEqual([]);

  await startPointer(page, handle(page, a));
  await page.mouse.move(target.x, target.y, { steps: 10 });
  await page.mouse.move(24, 24, { steps: 14 });
  await expect(page.locator('[data-gateway-list][data-insertion-slot]')).toHaveCount(0);
  await page.mouse.up();
  await expect(handle(page, a)).toBeFocused();
  expect(mock.writes).toEqual([]);
  expect(mock.activities).toEqual(before);
});

test('HTTP mock: a mid-arrangement conflict stops later commands, reports partial state and permits reconciliation', async ({
  page,
  gateway,
}) => {
  const mock = await seedPlan(page, gateway);
  mock.controls.failAtWrite = 2;
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  await pointerDrop(page, handle(page, originalIds[3]!), row(page, originalIds[0]!), 'before');
  await expect(page.getByText(/Lịch trình đã thay đổi/).first()).toBeVisible();
  expect(mock.writes).toHaveLength(2);
  expect(mock.writes.some((write) => write.method === 'PUT')).toBe(false);
  await expect(page.getByRole('button', { name: 'Thêm hoạt động', exact: true })).toBeDisabled();
  await expect(page.getByRole('dialog', { name: 'Chỉnh sửa hoạt động' })).toHaveCount(0);
  await page.locator('summary[aria-label="Tùy chọn lịch trình"]').click();
  await page.getByRole('button', { name: 'Tải lại để đối chiếu', exact: true }).click();
  expect(mock.writes).toHaveLength(2);
  await expectDayOrder(page, mock, originalIds);
});

test('HTTP mock: an uncertain committed step retries exact idempotency payload after reload without duplicate activity', async ({
  page,
  gateway,
}) => {
  const mock = await seedPlan(page, gateway);
  mock.controls.unknownAfterCommitAtWrite = 1;
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  await openPool(page);
  await pointerDrop(
    page,
    handle(page, locationId, 'location'),
    list(page).locator('[data-gateway-drop-end]'),
  );
  await expect(page.getByText(/Chưa xác định/).first()).toBeVisible();
  expect(mock.writes).toHaveLength(1);
  const originalWrite = structuredClone(mock.writes[0]!);
  await page.reload();
  await page.locator('summary[aria-label="Tùy chọn lịch trình"]').click();
  const retry = page.getByRole('button', { name: 'Thử lại đúng yêu cầu cũ', exact: true });
  await expect(retry).toBeDisabled();
  await page.getByRole('button', { name: 'Tải lại để đối chiếu', exact: true }).click();
  await retry.click();
  await expect.poll(() => mock.writes.length).toBeGreaterThanOrEqual(2);
  expect(mock.writes[1]).toEqual(originalWrite);
  await expect
    .poll(
      () =>
        mock.activities.filter((activity) => activity.selected_location_id === locationId).length,
    )
    .toBe(1);
  const created = mock.activities.find((activity) => activity.selected_location_id === locationId)!;
  await expectDayOrder(page, mock, [...originalIds, created.id]);
  activitiesForDay(mock, firstDay).slice(0, 4).forEach(expectOriginalTimes);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
