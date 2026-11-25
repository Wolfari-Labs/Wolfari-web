import { expect, test } from '@playwright/test';

const trip = '/trips/11111111-1111-4111-8111-111111111111';

for (const width of [1440, 402]) {
  test(`Dress code preview creates, edits and deletes an outfit at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`${trip}/dress-code`);
    const create = page.getByRole('button', { name: 'Tạo trang phục', exact: true });
    await expect(create).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await create.click();
    const editor = page.getByRole('dialog', { name: 'Tạo trang phục' });
    await expect(editor).toBeVisible();
    await editor.getByLabel('Tiêu đề').fill('Áo đi chơi');
    await editor.getByLabel('Phạm vi').selectOption('TRIP');
    await editor.getByRole('button', { name: 'Tạo trang phục', exact: true }).click();
    await expect(editor).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Thao tác Áo đi chơi' })).toBeVisible();

    await page.getByRole('button', { name: 'Thao tác Áo đi chơi' }).click();
    await page.getByRole('menuitem', { name: 'Chỉnh sửa' }).click();
    const edit = page.getByRole('dialog', { name: 'Chỉnh sửa trang phục' });
    await edit.getByLabel('Tiêu đề').fill('Áo đi biển');
    await edit.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(edit).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Thao tác Áo đi biển' })).toBeVisible();

    await page.getByRole('button', { name: 'Thao tác Áo đi biển' }).click();
    await page.getByRole('menuitem', { name: 'Xóa' }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Xóa trang phục?' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Xóa', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Thao tác Áo đi biển' })).toHaveCount(0);
  });
}
