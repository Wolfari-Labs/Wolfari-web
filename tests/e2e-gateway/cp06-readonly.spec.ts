import { expect, login, test } from './gateway-fixture';
import { mockPlan } from './plan-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';

test('HTTP mock: revoked Plan edit rights keep day and pool navigation read only', async ({
  page,
  gateway,
}) => {
  const mock = await mockPlan(page, gateway);
  mock.activities[0]!.scheduled_date = '2026-11-01';
  await login(page);
  await page.goto(`/trips/${tripId}/plan`);
  await expect(page.getByRole('listitem', { name: 'Đi dạo', exact: true })).toBeVisible();

  mock.controls.forbidden = true;
  await page.reload();
  await expect(page.getByRole('button', { name: 'Thêm hoạt động' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Kéo hoạt động Đi dạo' })).toHaveCount(0);

  const all = page.getByRole('button', { name: 'Tất cả', exact: true });
  const day = page.getByRole('button', { name: 'Ngày 1 · 01/11', exact: true });
  const pool = page.getByRole('button', { name: 'Chưa chọn ngày', exact: true });
  await expect(day).toHaveAttribute('aria-pressed', 'true');
  await expect(day).toBeEnabled();
  await expect(pool).toBeEnabled();

  await day.click();
  await expect(day).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('listitem', { name: 'Đi dạo', exact: true })).toBeVisible();
  await expect(page.getByRole('listitem', { name: 'Ăn sáng', exact: true })).toHaveCount(0);

  await pool.focus();
  await page.keyboard.press('Enter');
  await expect(pool).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('listitem', { name: 'Ăn sáng', exact: true })).toBeVisible();
  await expect(page.getByRole('listitem', { name: 'Đi dạo', exact: true })).toHaveCount(0);

  await all.click();
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('listitem', { name: 'Đi dạo', exact: true })).toBeVisible();
  await expect(page.getByRole('listitem', { name: 'Ăn sáng', exact: true })).toBeVisible();
  expect(mock.writes).toEqual([]);
});
