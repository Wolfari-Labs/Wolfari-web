import { expect, login, test } from './gateway-fixture';
import { mockPlan } from './plan-fixture';
const tripId = '11111111-1111-4111-8111-111111111111';

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`HTTP mock: Plan CRUD, completion and full reorder (${viewport.name})`, async ({
    page,
    gateway,
  }) => {
    await page.setViewportSize(viewport);
    const mock = await mockPlan(page, gateway);
    await login(page);
    await page.goto(`/trips/${tripId}/plan`);
    await expect(page.getByRole('heading', { name: 'Lịch trình chung' })).toBeVisible();
    await page.getByRole('button', { name: 'Thêm hoạt động' }).click();
    await page.getByLabel('Tên hoạt động', { exact: true }).fill('Tham quan bảo tàng');
    await page.getByLabel('Loại hoạt động', { exact: true }).fill('SIGHTSEEING');
    await page.getByRole('button', { name: 'Lưu' }).click();
    const created = page.getByRole('listitem', { name: 'Tham quan bảo tàng', exact: true });
    await expect(created).toBeVisible();
    await created.getByRole('button', { name: 'Sửa' }).click();
    await page.getByLabel('Tên hoạt động', { exact: true }).fill('Bảo tàng lịch sử');
    await page.getByRole('button', { name: 'Lưu' }).click();
    const edited = page.getByRole('listitem', { name: 'Bảo tàng lịch sử', exact: true });
    await expect(edited).toBeVisible();
    await edited.getByRole('button', { name: 'Hoàn tất', exact: true }).click();
    await expect(edited.getByRole('button', { name: 'Hoàn tất', exact: true })).toHaveCount(0);
    await edited.getByRole('button', { name: 'Thao tác Bảo tàng lịch sử' }).click();
    await page.getByRole('menuitem', { name: 'Đưa lên' }).click();
    await expect.poll(() => mock.writes.filter((write) => write.method === 'PUT').length).toBe(1);
    await edited.getByRole('button', { name: 'Thao tác Bảo tàng lịch sử' }).click();
    await page.getByRole('menuitem', { name: 'Xóa', exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận xóa' }).click();
    await expect(edited).toHaveCount(0);
    expect(mock.writes.map((write) => write.method)).toEqual([
      'POST',
      'PATCH',
      'PATCH',
      'PUT',
      'DELETE',
    ]);
    expect(mock.writes.map((write) => write.body.expected_plan_version)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(mock.writes.map((write) => write.key)).size).toBe(5);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Lịch trình chung' })).toBeVisible();
    await expect(page.getByRole('listitem', { name: 'Bảo tàng lịch sử', exact: true })).toHaveCount(
      0,
    );
  });
}

test('HTTP mock: Gateway exposes only the shared server Plan, never a competing local draft editor', async ({
  page,
  gateway,
}) => {
  const mock = await mockPlan(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  await expect(page.getByRole('heading', { name: 'Lịch trình chung' })).toBeVisible();
  await expect(page.getByRole('listitem', { name: 'Đi dạo', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bản nháp trên thiết bị' })).toHaveCount(0);
  await expect(page.locator('[data-preview]')).toHaveCount(0);
  expect(mock.writes).toEqual([]);
});

test('HTTP mock: Plan drawer remains scrollable at 2x document zoom and returns keyboard focus', async ({
  page,
  gateway,
}) => {
  await mockPlan(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  const trigger = page.getByRole('button', { name: 'Thêm hoạt động', exact: true });
  await expect(trigger).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  await trigger.click();
  const drawer = page.getByRole('dialog', { name: 'Chỉnh sửa lịch trình' });
  await expect(drawer.getByLabel('Tên hoạt động', { exact: true })).toBeFocused();
  const save = drawer.getByRole('button', { name: 'Lưu', exact: true });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
