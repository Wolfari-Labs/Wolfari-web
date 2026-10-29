import AxeBuilder from '@axe-core/playwright';
import { test, expect, login } from './gateway-fixture';
import { mockPlan } from './plan-fixture';
const tripId = '11111111-1111-4111-8111-111111111111';

for (const size of [
  { width: 1440, height: 900 },
  { width: 1366, height: 520 },
  { width: 820, height: 900 },
  { width: 768, height: 1024 },
  { width: 402, height: 874 },
  { width: 320, height: 600 },
]) {
  test(`Gateway visual and accessibility ${size.width}x${size.height}`, async ({
    page,
    gateway,
  }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize(size);
    await page.emulateMedia({ reducedMotion: size.width % 3 === 0 ? 'no-preference' : 'reduce' });
    await mockPlan(page, gateway);
    await page.goto('/login');
    const email = page.getByRole('textbox', { name: 'Email', exact: true });
    await email.focus();
    await expect(email).toHaveCSS('outline-style', 'none');
    await expect(email.locator('..')).toHaveCSS('outline-width', '2px');
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByText(/Identity hiện không khả dụng|Nếu thông tin không hợp lệ/),
    ).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('login.png'), fullPage: true });
    const loginAxe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(loginAxe.violations).toEqual([]);
    await login(page);
    for (const [name, path] of [
      ['profile', '/profile'],
      ['trips', '/trips'],
      ['overview', `/trips/${tripId}`],
      ['plan', `/trips/${tripId}/plan`],
      ['members', `/trips/${tripId}/members`],
      ['fund', `/trips/${tripId}/fund`],
      ['map', `/trips/${tripId}/map`],
      ['dress', `/trips/${tripId}/dress-code`],
      ['packing', `/trips/${tripId}/packing`],
      ['settings', `/trips/${tripId}/settings`],
      ['create', '/trips/new'],
    ]) {
      await page.goto(path!);
      await expect(page.locator('main h1').first()).toBeVisible();
      await expect(page.locator('[data-preview]')).toHaveCount(0);
      if (name === 'profile')
        await expect(page.getByLabel('Tên hiển thị')).toHaveValue('Trang Gateway');
      else if (name === 'trips')
        await expect(page.getByText('Đà Nẵng Gateway', { exact: true })).toBeVisible();
      else if (name === 'members')
        await expect(page.getByRole('region', { name: 'Danh sách thành viên' })).toBeVisible();
      else if (name === 'fund')
        await expect(page.getByRole('heading', { name: 'Chuyến đi chưa bật quỹ' })).toBeVisible();
      else if (name === 'map')
        await expect(
          page.getByRole('heading', { name: 'Chuyến đi chưa có địa điểm' }),
        ).toBeVisible();
      else if (name === 'dress')
        await expect(
          page.getByRole('heading', { name: 'Chưa có hướng dẫn trang phục' }),
        ).toBeVisible();
      else if (name === 'packing')
        await expect(page.getByRole('heading', { name: 'Chưa có hành lý đã lưu' })).toBeVisible();
      else if (name === 'settings')
        await expect(
          page.getByRole('heading', { name: 'Thông tin chuyến đi', exact: true }),
        ).toBeVisible();
      else if (name === 'create') {
        await expect(page.getByLabel('Tên chuyến đi', { exact: true })).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'Tạo chuyến đi mới', exact: true }),
        ).toBeVisible();
      } else await expect(page.getByRole('region', { name: 'Thông tin chuyến đi' })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      if (name === 'plan')
        await expect(page.getByRole('listitem', { name: 'Đi dạo', exact: true })).toBeVisible();
      await page.evaluate(async () => {
        await Promise.all(
          document
            .getAnimations()
            .filter((a) => a.effect?.getTiming().iterations !== Infinity)
            .map((a) => a.finished.catch(() => {})),
        );
      });
      await page.screenshot({ path: info.outputPath(name + '.png'), fullPage: true });
      if (name === 'plan') {
        await page.getByRole('listitem', { name: 'Ăn sáng', exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath('plan-cards.png') });
      }
      if (size.width === 1440 || name === 'create') {
        const scan = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        expect.soft(scan.violations, name).toEqual([]);
      }
    }
    if (size.width > 1100) {
      await page.goto(`/trips/${tripId}/settings`);
      await expect(
        page.getByRole('heading', { name: 'Thông tin chuyến đi', exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Thu gọn thanh điều hướng' }).click();
      await page.screenshot({ path: info.outputPath('collapsed.png'), fullPage: true });
      await page.getByRole('button', { name: 'Mở rộng thanh điều hướng' }).click();
      const trigger = page.getByRole('button', { name: 'Mở menu tài khoản' });
      await trigger.focus();
      await trigger.press('Enter');
      await expect(page.getByRole('menu')).toBeVisible();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('menu')).not.toBeVisible();
      await expect(trigger).toBeFocused();
    }
  });
}
test('Gateway inbox closes on route change and restores body scrolling', async ({
  page,
  gateway,
}) => {
  void gateway;
  await login(page);
  await page
    .getByRole('button', { name: 'Thông báo', exact: true })
    .filter({ visible: true })
    .click();
  const inbox = page.getByRole('dialog', { name: 'Thông báo', exact: true });
  await expect(inbox).toBeVisible();
  await inbox.getByRole('link', { name: 'Tùy chọn thông báo' }).click();
  await expect(inbox).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
    .not.toBe('hidden');
});
test('Gateway trip card menu opens settings without exposing unavailable actions', async ({
  page,
  gateway,
}) => {
  void gateway;
  await login(page);
  await page.goto('/trips');
  const trigger = page.getByRole('button', { name: 'Thao tác Đà Nẵng Gateway', exact: true });
  await trigger.click();
  await expect(page.getByRole('menu')).toBeVisible();
  await expect(page.getByRole('menuitem')).toHaveCount(2);
  await page.getByRole('menuitem', { name: 'Cài đặt chuyến đi' }).click();
  await expect(page).toHaveURL(`/trips/${tripId}/settings`);
  await expect(page.getByRole('menu')).not.toBeVisible();
});
