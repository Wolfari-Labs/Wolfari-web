import { test, expect } from '@playwright/test';
const route = '/trips/11111111-1111-4111-8111-111111111111/members';
for (const size of [
  { width: 1440, height: 800 },
  { width: 1366, height: 600 },
  { width: 1366, height: 520 },
  { width: 1024, height: 600 },
  { width: 820, height: 600 },
  { width: 768, height: 600 },
  { width: 402, height: 874 },
  { width: 320, height: 480 },
])
  test(`Members preview ${size.width}x${size.height}`, async ({ page }, info) => {
    await page.setViewportSize(size);
    const api: string[] = [];
    page.on('request', (r) => {
      if (new URL(r.url()).pathname.startsWith('/api/')) api.push(r.url());
    });
    await page.goto(route);
    await expect(page.getByText('User aaaaaaaa…aaaa', { exact: true })).toBeVisible();
    const region = page.getByRole('region', { name: 'Danh sách thành viên' });
    await expect(region.getByText(/Trang Nguyễn|Hà Nguyễn|Quyên Trần|Tân Lê/)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      size.width,
    );
    if (size.width === 1440) {
      const hero = (await page.getByRole('region', { name: 'Thông tin chuyến đi' }).boundingBox())!;
      for (const [key, expected] of Object.entries({ x: 238, y: 120, width: 1180, height: 150 }))
        expect(
          Math.abs(hero[key as keyof typeof hero] - expected),
          `Figma hero ${key}`,
        ).toBeLessThanOrEqual(4);
    }
    const identity = region.locator('details').first().locator('summary');
    await identity.click();
    await expect(
      region.getByText('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', { exact: true }),
    ).toBeVisible();
    await identity.click();
    await page.getByText('Rời chuyến đi', { exact: true }).scrollIntoViewIfNeeded();
    if (size.width > 768) {
      expect(await page.evaluate(() => scrollY)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
        size.height,
      );
    } else expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await page.locator('main').evaluate((e) => (e.scrollTop = 0));
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath('members.png'), fullPage: true });
    await page.getByRole('button', { name: 'Lời mời · Xem trước' }).click();
    await expect(page.getByText('linh@example.com', { exact: true })).toBeVisible();
    await page.getByLabel('Email người nhận').fill('preview@example.com');
    await page.getByRole('button', { name: 'Kiểm tra lời mời' }).click();
    await expect(
      page.getByText(/Chưa gửi lời mời, tạo link hoặc thay đổi thành viên/),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      size.width,
    );
    await page.locator('main').evaluate((e) => (e.scrollTop = 0));
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath('invitations.png'), fullPage: true });
    expect(api).toEqual([]);
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  });
test('member and invitation states, terminal statuses, draft and permission', async ({ page }) => {
  await page.goto(route);
  await expect(page.getByText('User aaaaaaaa…aaaa', { exact: true })).toBeVisible();
  await page.locator('[data-preview=members] summary').click();
  for (const [state, text] of [
    ['error', 'Chưa thể tải nội dung'],
    ['forbidden', 'Bạn không có quyền truy cập'],
    ['not-found', 'Không tìm thấy nội dung'],
    ['conflict', 'Dữ liệu đã thay đổi'],
    ['unavailable', 'Chức năng chưa khả dụng'],
    ['empty', 'Chưa có nội dung'],
    ['loading', 'Đang tải…'],
  ] as const) {
    await page.getByLabel('Trạng thái thành viên').selectOption(state);
    await expect(page.getByRole('heading', { name: text, exact: true })).toBeVisible();
  }
  await page.getByLabel('Trạng thái thành viên').selectOption('success');
  await expect(page.getByRole('button', { name: 'Quyền sửa lịch trình' })).toBeDisabled();
  await page.getByRole('button', { name: 'Lời mời · Xem trước' }).click();
  await page.getByLabel('Email người nhận').fill('draft@example.com');
  for (const [state, text] of [
    ['expired', 'Đã hết hạn'],
    ['revoked', 'Đã thu hồi'],
    ['used', 'Đã sử dụng'],
  ] as const) {
    await page.getByLabel('Trạng thái lời mời').selectOption(state);
    await expect(page.getByText(text, { exact: true })).toBeVisible();
    await expect(page.getByText(/Phiên bản 2/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Gửi lại' })).toBeDisabled();
  }
  for (const [state, text] of [
    ['error', 'Chưa thể tải nội dung'],
    ['forbidden', 'Bạn không có quyền truy cập'],
    ['not-found', 'Không tìm thấy nội dung'],
    ['conflict', 'Dữ liệu đã thay đổi'],
    ['unavailable', 'Chức năng chưa khả dụng'],
    ['empty', 'Chưa có nội dung'],
    ['loading', 'Đang tải…'],
  ] as const) {
    await page.getByLabel('Trạng thái lời mời').selectOption(state);
    await expect(page.getByRole('heading', { name: text, exact: true })).toBeVisible();
    await expect(page.getByLabel('Email người nhận')).toHaveValue('draft@example.com');
  }
  await page.getByLabel('Trạng thái lời mời').selectOption('success');
  await page.getByLabel('Trạng thái thao tác preview').selectOption('unknown');
  await expect(page.getByText(/Chưa xác nhận gửi lời mời/)).toBeVisible();
  await expect(page.getByText(/Membership revision 1/)).toBeVisible();
  await page.goto('/trips/33333333-3333-4333-8333-333333333333/members');
  await expect(page.getByText('User aaaaaaaa…aaaa', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lời mời · Xem trước' })).toBeDisabled();
});
