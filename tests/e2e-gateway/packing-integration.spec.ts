import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, login } from './gateway-fixture';

import { install, tripId } from './packing-fixture';
test('Packing roster failure retries without clearing draft, focus refresh blocks stale editor', async ({
  page,
  gateway,
}) => {
  const { trip } = await install(page, gateway);
  let failMembers = true;
  await page.route('**/api/v1/trips/*/members?*', (route) =>
    failMembers
      ? route.fulfill({
          status: 503,
          json: { error: { code: 'SERVICE_UNAVAILABLE', message: 'unavailable' } },
        })
      : route.fallback(),
  );
  await login(page);
  await page.goto(`/trips/${tripId}/packing`);
  const dialog = await openAdd(page);
  await expect(dialog.getByRole('button', { name: 'Thêm vào danh sách' })).toBeDisabled();
  failMembers = false;
  await dialog.getByRole('button', { name: 'Tải lại thành viên' }).click();
  await expect(dialog.getByRole('button', { name: 'Thêm vào danh sách' })).toBeEnabled();
  await expect(dialog.getByRole('combobox', { name: 'Tên vật dụng' })).toHaveValue('Áo mưa');
  trip.plan_version++;
  trip.export_revision++;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(dialog.getByText(/Danh sách đã thay đổi/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Thêm vào danh sách' })).toBeDisabled();
});

test('Packing capability off stays read-only without fake writer routes', async ({
  page,
  gateway,
}) => {
  const { state } = await install(page, gateway);
  state.capability = false;
  await login(page);
  await page.goto(`/trips/${tripId}/packing`);
  await expect(page.getByText('Chưa có hành lý đã lưu')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thêm vật dụng', exact: true })).toHaveCount(0);
  expect(state.writes).toEqual([]);
});
async function openAdd(page: Page) {
  await page.getByRole('button', { name: 'Thêm vật dụng', exact: true }).click();
  await page.getByRole('combobox', { name: 'Tên vật dụng' }).fill('Áo mưa');
  return page.getByRole('dialog', { name: 'Thêm vật dụng' });
}
async function editItem(page: Page) {
  await page.getByRole('button', { name: 'Thao tác Áo mưa' }).click();
  await page.getByRole('menuitem', { name: 'Chỉnh sửa' }).click();
  return page.getByRole('dialog', { name: 'Chỉnh sửa vật dụng' });
}
test('Packing real contract: create with assignment, reload, edit, complete, unassign, undo and delete', async ({
  page,
  gateway,
}) => {
  const { state } = await install(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/packing`);
  let dialog = await openAdd(page);
  await dialog.getByLabel('Người chuẩn bị').selectOption({ label: 'Member Gateway' });
  await dialog.getByLabel('Hạn chuẩn bị').fill('2026-11-25');
  await expect(dialog.getByLabel('Nhắc nhở')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Thêm vào danh sách' }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0]!.body.assigned_member_id).toBe(`b${tripId.slice(1)}`);
  expect(state.writes[0]!.body.due_at).toBe('2026-11-25T16:59:00.000Z');
  await page.reload();
  await expect(page.getByText('Member Gateway')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Hoàn thành Áo mưa', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Bỏ hoàn thành Áo mưa' })).toBeChecked();
  dialog = await editItem(page);
  await dialog.getByLabel('Số lượng').fill('1.25');
  await dialog.getByLabel('Người chuẩn bị').selectOption('');
  await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'Bỏ hoàn thành Áo mưa' })).toBeChecked();
  expect(state.rows[0]?.assigned_member_id).toBeNull();
  expect(state.rows[0]?.due_at).toBe('2026-11-25T16:59:00.000Z');
  await page.getByRole('checkbox', { name: 'Bỏ hoàn thành Áo mưa' }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Hoàn thành Áo mưa', exact: true }),
  ).not.toBeChecked();
  await page.getByRole('button', { name: 'Thao tác Áo mưa' }).click();
  await page.getByRole('menuitem', { name: 'Xóa', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận' }).click();
  await expect(page.getByText('Chưa có hành lý đã lưu')).toBeVisible();
  expect(state.writes.at(-1)?.method).toBe('DELETE');
});

test('Packing unknown result survives reload and retries original command without duplication', async ({
  page,
  gateway,
}) => {
  const { state } = await install(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/packing`);
  const dialog = await openAdd(page);
  state.loseResponse = true;
  await dialog.getByRole('button', { name: 'Thêm vào danh sách' }).click();
  await expect(dialog.getByText(/Chưa rõ kết quả lưu/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Thêm vật dụng', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Đối soát dữ liệu' }).click();
  await page.getByRole('button', { name: 'Kiểm tra lại lệnh cũ' }).click();
  await expect(page.getByRole('button', { name: 'Thêm vật dụng', exact: true })).toBeEnabled();
  expect(state.rows).toHaveLength(1);
  expect(state.writes).toHaveLength(2);
  expect(state.writes[0]).toEqual(state.writes[1]);
});

test('Packing validation keeps draft; conflict requires review; dirty close confirms discard', async ({
  page,
  gateway,
}) => {
  const { state } = await install(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/packing`);
  const dialog = await openAdd(page);
  state.reject = 'VALIDATION_FAILED';
  await dialog.getByRole('button', { name: 'Thêm vào danh sách' }).click();
  await expect(dialog.getByText(/Chưa lưu được/)).toBeVisible();
  await expect(dialog.getByRole('combobox', { name: 'Tên vật dụng' })).toHaveValue('Áo mưa');
  state.reject = 'VERSION_CONFLICT';
  await dialog.getByRole('button', { name: 'Thêm vào danh sách' }).click();
  await expect(dialog.getByText(/Dữ liệu hoặc quyền đã thay đổi/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Thêm vào danh sách' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(page.getByRole('alertdialog', { name: 'Bỏ thay đổi chưa lưu?' })).toBeVisible();
  await page.getByRole('button', { name: 'Bỏ thay đổi', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.rows).toHaveLength(0);
});

test('Packing editor responsive and accessible with backend capability only', async ({
  page,
  gateway,
}, info) => {
  await install(page, gateway);
  await login(page);
  await page.goto(`/trips/${tripId}/packing`);
  const initial = await openAdd(page);
  await initial.getByLabel('Người chuẩn bị').selectOption({ label: 'Member Gateway' });
  await initial.getByLabel('Ghi chú').fill('Chuẩn bị áo mưa dùng chung cho chuyến đi.');
  await initial.getByRole('button', { name: 'Thêm vào danh sách' }).click();
  await expect(initial).toHaveCount(0);
  for (const width of [1440, 768, 402, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page
      .getByRole('checkbox', { name: 'Hoàn thành Áo mưa', exact: true })
      .scrollIntoViewIfNeeded();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`packing-list-${width}.png`) });
    await page.getByRole('button', { name: 'Thêm vật dụng', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Thêm vật dụng' });
    await expect(dialog.getByRole('button', { name: 'Thêm vào danh sách' })).toBeEnabled();
    expect(
      (
        await new AxeBuilder({ page })
          .include('[role="dialog"]')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`packing-${width}.png`) });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Thêm vật dụng', exact: true })).toBeFocused();
  }
});
