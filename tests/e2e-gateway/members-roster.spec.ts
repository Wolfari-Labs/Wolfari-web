import { expect, test } from './gateway-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';
const memberId = `b${tripId.slice(1)}`;
const memberUserId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

test('HTTP mock: roster roles match current data and transfer opens the existing confirmation form', async ({
  page,
  gateway,
}, info) => {
  gateway.authenticated = true;
  gateway.trips[0]!.plan_edit_policy = 'SELECTED_MEMBERS';
  gateway.editorAssignments.set(tripId, [memberId]);
  await page.route(`**/api/v1/trips/${tripId}/fund`, async (route) =>
    route.fulfill({
      json: {
        data: {
          id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          trip_id: tripId,
          holder_user_id: memberUserId,
          currency: 'VND',
          budget_amount: null,
          current_balance: '0',
          reserved_refund: '0',
          available_balance: '0',
          status: 'OPEN',
          finance_version: 1,
          closed_at: null,
        },
        meta: { correlation_id: 'member-roster-fund' },
      },
    }),
  );
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`/trips/${tripId}/members`);
  const region = page.getByRole('region', { name: 'Danh sách thành viên', exact: true });
  const heading = region.locator('[data-region="member-roster-heading"]');
  await expect(heading.locator('span')).toHaveText([
    'Thành viên',
    'Vai trò / Trách nhiệm',
    'Thao tác',
  ]);
  const owner = region.locator(`[data-member-id="a${tripId.slice(1)}"]`);
  const member = region.locator(`[data-member-id="${memberId}"]`);
  await expect(owner.locator('[data-role="OWNER"]')).toContainText('Owner');
  await expect(owner.getByText('Được sửa Plan', { exact: true })).toBeVisible();
  await expect(owner.locator('[data-region="member-actions"]')).toHaveText('Bạn');
  await expect(owner.getByRole('button')).toHaveCount(0);
  await expect(member.getByText('Member', { exact: true })).toBeVisible();
  await expect(member.getByText('Được sửa Plan', { exact: true })).toBeVisible();
  await expect(member.getByText('Fund Holder', { exact: true })).toBeVisible();

  for (let index = 0; index < 3; index += 1) {
    const headerBounds = await heading.locator(':scope > span').nth(index).boundingBox();
    const rowBounds = await member.locator(':scope > div').nth(index).boundingBox();
    expect(headerBounds).not.toBeNull();
    expect(rowBounds).not.toBeNull();
    expect(Math.abs(headerBounds!.x - rowBounds!.x)).toBeLessThanOrEqual(1);
  }
  await page.screenshot({ path: info.outputPath('member-roster-desktop.png') });
  const menu = member.getByRole('button', { name: 'Thao tác thành viên · Member Gateway' });
  await menu.click();
  await expect(page.getByRole('menuitem', { name: 'Xóa thành viên', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await menu.click();
  await page.getByRole('menuitem', { name: 'Xóa thành viên', exact: true }).click();
  const removal = page.getByRole('dialog', { name: 'Xóa thành viên', exact: true });
  await removal.getByRole('textbox', { name: 'Lý do rời/xóa' }).fill('Kiểm tra biểu mẫu');
  await expect(removal.getByRole('button', { name: 'Xác nhận rời/xóa' })).toBeEnabled();
  await removal.getByRole('button', { name: 'Đóng xóa thành viên', exact: true }).click();
  await expect(removal).toHaveCount(0);
  await expect(menu).toBeFocused();

  await page.setViewportSize({ width: 1366, height: 520 });
  const list = region.locator('[data-region="member-roster-list"]');
  await expect.poll(() => list.evaluate((node) => node.clientHeight)).toBeGreaterThanOrEqual(68);
  info.annotations.push({
    type: 'short-roster-height',
    description: String(await list.evaluate((node) => node.clientHeight)),
  });
  await expect(owner).toBeInViewport({ ratio: 1 });
  const footer = region.getByRole('button', { name: 'Tải thêm thành viên', exact: true });
  await expect(footer).toBeInViewport({ ratio: 1 });
  const ownerBounds = (await owner.boundingBox())!;
  const footerBounds = (await footer.boundingBox())!;
  expect(ownerBounds.y + ownerBounds.height).toBeLessThanOrEqual(footerBounds.y + 1);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(520);
  await page.screenshot({ path: info.outputPath('member-roster-short.png') });

  await page.setViewportSize({ width: 402, height: 874 });
  await expect(member.getByRole('button', { name: 'Chuyển Owner · Member Gateway' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(402);
  await page.screenshot({ path: info.outputPath('member-roster-mobile.png') });
  expect(
    gateway.calls.filter(
      (call) => call.path.startsWith(`/api/v1/trips/${tripId}`) && call.method !== 'GET',
    ),
  ).toEqual([]);

  await member.getByRole('button', { name: 'Chuyển Owner · Member Gateway' }).click();
  await expect(page).toHaveURL(
    `/trips/${tripId}/settings?mode=settings&section=archive&transferTo=${memberId}`,
  );
  const dialog = page.getByRole('dialog', { name: 'Cài đặt chuyến đi', exact: true });
  await expect(dialog.getByLabel('Thao tác', { exact: true })).toHaveValue('TRANSFER');
  await expect(dialog.getByLabel('Owner mới', { exact: true })).toHaveValue(memberId);
  await expect(dialog.getByRole('button', { name: 'Chuyển Owner', exact: true })).toBeDisabled();
  expect(
    gateway.calls.filter(
      (call) => call.path.startsWith(`/api/v1/trips/${tripId}`) && call.method !== 'GET',
    ),
  ).toEqual([]);
});
