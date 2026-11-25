import { expect, login, test } from './gateway-fixture';
import { mockPlan } from './plan-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 320, height: 568 },
]) {
  test(`CP06 HTTP mock: centered activity editor remains usable at ${viewport.width}px`, async ({
    page,
    gateway,
  }) => {
    await page.setViewportSize(viewport);
    const mock = await mockPlan(page, gateway);
    await login(page);
    await page.goto(`/trips/${tripId}/plan`);
    await page.getByRole('button', { name: 'Tất cả', exact: true }).click();

    await page.locator('summary[aria-label="Tùy chọn lịch trình"]').click();
    const trigger = page.getByRole('button', { name: 'Tạo hoạt động thủ công', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Thêm hoạt động' });
    await expect(dialog.getByLabel('Tên hoạt động', { exact: true })).toBeFocused();
    for (const label of [
      'Loại hoạt động',
      'Mô tả',
      'Mô tả công khai',
      'Địa điểm',
      'Ngày bắt đầu hoặc ngày chưa có giờ',
      'Giờ bắt đầu',
      'Ngày kết thúc (nếu có giờ)',
      'Giờ kết thúc',
    ]) {
      await expect(dialog.getByLabel(label, { exact: true })).toBeAttached();
    }

    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    expect(Math.abs(bounds!.x + bounds!.width / 2 - viewport.width / 2)).toBeLessThan(2);

    const save = dialog.getByRole('button', { name: 'Lưu', exact: true });
    await save.scrollIntoViewIfNeeded();
    await expect(save).toBeInViewport();
    await dialog.getByLabel('Tên hoạt động', { exact: true }).fill('Dừng chân mới');
    await save.click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('listitem', { name: 'Dừng chân mới' })).toBeVisible();
    expect(mock.writes.map((write) => write.method)).toEqual(['POST']);
    expect(mock.writes[0]?.body).toMatchObject({
      title: 'Dừng chân mới',
      scheduled_date: null,
      starts_at: null,
      ends_at: null,
    });

    await trigger.click();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
}
