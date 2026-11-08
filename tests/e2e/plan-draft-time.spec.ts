import { test, expect } from '@playwright/test';

const route = '/trips/11111111-1111-4111-8111-111111111111/plan';

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'narrow', width: 402, height: 874 },
]) {
  test(`Fixture: local Plan day edits persist entered times and date-only state (${viewport.name})`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const apiRequests: string[] = [];
    const pageErrors: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto(route);
    const timeline = page.getByRole('list', { name: 'Các hoạt động trong ngày' });
    const original = timeline.getByRole('listitem').filter({
      has: page.getByRole('heading', { name: 'Bán đảo Sơn Trà', exact: true }),
    });
    await expect(original).toBeVisible();
    await original.getByLabel('Xem hoạt động Bán đảo Sơn Trà').click();
    await original.getByRole('button', { name: 'Chỉnh sửa hoạt động', exact: true }).click();

    const editor = page.getByRole('dialog', { name: 'Chỉnh sửa hoạt động' });
    const title = 'Khám phá Sơn Trà — đổi ngày';
    await editor.getByLabel('Tên hoạt động', { exact: true }).fill(title);
    await editor.getByLabel('Ngày', { exact: true }).selectOption('2026-09-23');
    await editor.getByLabel('Giờ bắt đầu', { exact: true }).fill('09:15');
    await editor.getByLabel('Giờ kết thúc', { exact: true }).fill('10:30');
    await editor.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await expect(editor).toHaveCount(0);
    await expect(original).toHaveCount(0);

    await page.getByRole('button', { name: /Ngày 2/ }).click();
    const moved = timeline.getByRole('listitem').filter({
      has: page.getByRole('heading', { name: title, exact: true }),
    });
    await expect(moved).toHaveCount(1);
    await expect(moved.getByText('09:15 – 10:30', { exact: true }).first()).toBeVisible();

    await page.reload();
    await page.getByRole('button', { name: /Ngày 2/ }).click();
    await expect(moved.getByText('09:15 – 10:30', { exact: true }).first()).toBeVisible();
    await moved.getByLabel(`Xem hoạt động ${title}`).click();
    await moved.getByRole('button', { name: 'Chỉnh sửa hoạt động', exact: true }).click();
    await expect(editor.getByLabel('Ngày', { exact: true })).toHaveValue('2026-09-23');
    await expect(editor.getByLabel('Giờ bắt đầu', { exact: true })).toHaveValue('09:15');
    await expect(editor.getByLabel('Giờ kết thúc', { exact: true })).toHaveValue('10:30');

    // Explicitly clearing both fields must still permit a date-only activity on a new day.
    await editor.getByLabel('Ngày', { exact: true }).selectOption('2026-09-24');
    await editor.getByLabel('Giờ bắt đầu', { exact: true }).fill('');
    await editor.getByLabel('Giờ kết thúc', { exact: true }).fill('');
    await editor.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await expect(editor).toHaveCount(0);
    await expect(moved).toHaveCount(0);
    await page.getByRole('button', { name: /Ngày 3/ }).click();
    await expect(moved.getByText('Chưa xếp giờ', { exact: true }).first()).toBeVisible();

    await page.reload();
    await page.getByRole('button', { name: /Ngày 3/ }).click();
    await expect(moved.getByText('Chưa xếp giờ', { exact: true }).first()).toBeVisible();
    await moved.getByLabel(`Xem hoạt động ${title}`).click();
    await moved.getByRole('button', { name: 'Chỉnh sửa hoạt động', exact: true }).click();
    await expect(editor.getByLabel('Ngày', { exact: true })).toHaveValue('2026-09-24');
    await expect(editor.getByLabel('Giờ bắt đầu', { exact: true })).toHaveValue('');
    await expect(editor.getByLabel('Giờ kết thúc', { exact: true })).toHaveValue('');
    await editor.getByRole('button', { name: 'Hủy', exact: true }).click();
    await expect(editor).toHaveCount(0);

    expect(apiRequests).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}
