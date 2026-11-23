import { test, expect, detail, createTrip, activity } from '../fixtures';
test('PLAN-001 Tạo và hoàn thành Activity tồn tại sau reload', detail('PLAN-001', ['FR-PL-05', 'FR-PL-08'], 'LichTrinh', true), async ({ page }, info) => {
  const trip = await createTrip(page, info);
  await page.goto(trip.path + '/plan');
  await activity(page, 'Hoạt động QA');
  const row = page.getByRole('listitem', { name: 'Hoạt động QA', exact: true });
  await row.getByRole('button', { name: 'Hoàn tất', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Mở lại', exact: true })).toBeVisible();
  await page.reload();
  await expect(row.getByRole('button', { name: 'Mở lại', exact: true })).toBeVisible();
});
test('PLAN-002 Chỉ đổi thứ tự phải giữ ID nội dung và giờ', detail('PLAN-002', ['FR-PL-07', 'DR-03'], 'LichTrinh'), async ({ page }, info) => {
  const trip = await createTrip(page, info);
  await page.goto(trip.path + '/plan');
  await activity(page, 'A QA'); await activity(page, 'B QA');
  const readPlan = async () => {
    const response = page.waitForResponse(r => new URL(r.url()).pathname === `/api/v1/trips/${trip.id}/plan` && r.request().method() === 'GET');
    await page.reload();
    return (await (await response).json()).data;
  };
  const before = await readPlan();
  await page.getByRole('listitem', { name: 'B QA', exact: true }).getByRole('button', { name: 'Đưa lên', exact: true }).click();
  await expect(page.getByRole('listitem', { name: 'B QA', exact: true }).getByRole('button', { name: 'Đưa lên', exact: true })).toBeDisabled();
  const after = await readPlan();
  type Activity = { id: string; title: string; starts_at: string | null; ends_at: string | null };
  const identity = (rows: Activity[]) => rows.map(({ id, title, starts_at, ends_at }) => ({ id, title, starts_at, ends_at })).sort((a, b) => a.id.localeCompare(b.id));
  expect(identity(after.activities)).toEqual(identity(before.activities));
  expect(after.plan_version).toBeGreaterThan(before.plan_version);
});
