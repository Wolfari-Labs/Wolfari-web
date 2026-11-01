import { expect, test } from '@playwright/test';

const route = '/trips/11111111-1111-4111-8111-111111111111/packing';

test.describe('Packing List preview suggestions', () => {
  test('read-only preview keeps the existing disabled item controls', async ({ page }) => {
    await page.goto(route);
    await page.getByText('Packing preview · Dữ liệu minh họa').click();
    await page.getByLabel('Trạng thái dữ liệu').selectOption('read-only');

    await expect(page.getByRole('button', { name: /Thêm vật dụng/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Đánh dấu Áo khoác mỏng' })).toBeDisabled();
    await page.getByRole('button', { name: 'Thao tác Áo khoác mỏng' }).click();
    await expect(page.getByRole('menuitem', { name: 'Chỉnh sửa' })).toBeDisabled();
    await expect(page.getByRole('menuitem', { name: 'Xóa' })).toBeDisabled();
    await expect(page.getByText('Danh sách hiện chỉ hỗ trợ xem.')).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Tiến độ packing list' }).getByText('Chỉ xem'),
    ).toHaveCount(0);
  });

  test('desktop opens the right drawer and accepts a suggested item', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(route);
    await expect(
      page.getByRole('heading', { name: 'Packing list', level: 1, exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: /Thêm vật dụng/ }).click();
    const drawer = page.getByRole('dialog', { name: 'Thêm vật dụng' });
    await expect(drawer).toBeVisible();
    await drawer.getByRole('combobox', { name: 'Tên vật dụng' }).fill('Áo');
    await expect(drawer.getByRole('listbox')).toBeVisible();
    await drawer.getByRole('option', { name: /Áo mưa/ }).click();
    await expect(drawer.getByRole('combobox', { name: 'Tên vật dụng' })).toHaveValue('Áo mưa');
    await expect(drawer.getByRole('combobox', { name: 'Danh mục' })).toHaveValue('Quần áo');
    await expect(
      page.evaluate(() => document.documentElement.scrollWidth),
    ).resolves.toBeLessThanOrEqual(1440);
  });

  test('mobile keeps custom category suggestion inside the form flow', async ({ page }) => {
    await page.setViewportSize({ width: 402, height: 874 });
    await page.goto(route);
    await page.getByRole('button', { name: /Thêm vật dụng/ }).click();
    const drawer = page.getByRole('dialog', { name: 'Thêm vật dụng' });
    await drawer.getByRole('combobox', { name: 'Danh mục' }).fill('Đồ đi biển');
    await expect(drawer.getByRole('option', { name: '+ Tạo danh mục “Đồ đi biển”' })).toBeVisible();
    await expect(
      page.evaluate(() => document.documentElement.scrollWidth),
    ).resolves.toBeLessThanOrEqual(402);
  });

  test('keeps the last item edit action visible and usable', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(route);
    const action = page.getByRole('button', { name: 'Thao tác Thuốc đau đầu' });
    await action.scrollIntoViewIfNeeded();
    await action.click();
    const edit = page.getByRole('menuitem', { name: 'Chỉnh sửa' });
    await expect(edit).toBeVisible();
    await edit.click();
    await expect(page.getByRole('dialog', { name: 'Chỉnh sửa vật dụng' })).toBeVisible();
  });
});
