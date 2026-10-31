import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function waitForVisibleImages(page: Page) {
  for (const image of await page.locator('img:visible').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate((element) => {
          const target = element as HTMLImageElement;
          return target.complete && target.naturalWidth > 0;
        }),
      )
      .toBe(true);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

for (const width of [1440, 402]) {
  test(`CP04 fixture guest and signed-in Home review ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 402 ? 874 : 960 });
    const apiCalls: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/')) apiCalls.push(request.url());
    });
    await page.goto('/');
    await expect(page.locator('[data-node-id="3:28"]')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Bắt đầu ngay', exact: true })).toHaveAttribute(
      'href',
      '/register',
    );
    await waitForVisibleImages(page);
    await page.screenshot({ path: info.outputPath('home-guest.png'), fullPage: true });
    const homeScan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(homeScan.violations).toEqual([]);

    await page.goto('/login');
    await expect(page.getByRole('form', { name: 'Biểu mẫu đăng nhập' })).toBeVisible();
    await waitForVisibleImages(page);
    await page.screenshot({ path: info.outputPath('login.png'), fullPage: true });
    await page.goto('/register');
    await expect(page.getByRole('form', { name: 'Biểu mẫu đăng ký' })).toBeVisible();
    await waitForVisibleImages(page);
    await page.screenshot({ path: info.outputPath('register.png'), fullPage: true });
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await expect(page.getByLabel('Họ và tên')).toBeFocused();
    await page.screenshot({ path: info.outputPath('register-invalid.png'), fullPage: true });
    await page.goto('/login');
    await page.getByRole('button', { name: 'Điền tài khoản demo' }).click();
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.locator('[data-node-id="298:1642"]')).toBeVisible();
    await expect(page.getByText(/Phiên demo · Chỉ dữ liệu fixture/)).toBeVisible();
    await waitForVisibleImages(page);
    await page.screenshot({ path: info.outputPath('home-signed-in-fixture.png'), fullPage: true });
    expect(apiCalls).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}

for (const height of [520, 600, 900, 950, 951, 960, 985, 986, 990]) {
  test(`CP04 trip sidebar shows Settings on first render at 1440x${height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1440, height });
    await page.goto('/login');
    await page.getByRole('button', { name: 'Điền tài khoản demo' }).click();
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.goto('/trips/11111111-1111-4111-8111-111111111111/settings');
    await expect(page.getByRole('heading', { name: 'Thông tin chuyến đi' })).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Điều hướng chuyến đi' });
    const settings = nav.getByRole('link', { name: 'Cài đặt' });
    await expect(settings).toBeVisible();
    const geometry = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Điều hướng chuyến đi"]');
      const settings = [...(nav?.querySelectorAll('a') ?? [])].find((link) =>
        link.textContent?.includes('Cài đặt'),
      );
      if (!nav || !settings) return null;
      return {
        navTop: nav.getBoundingClientRect().top,
        navBottom: nav.getBoundingClientRect().bottom,
        settingsTop: settings.getBoundingClientRect().top,
        settingsBottom: settings.getBoundingClientRect().bottom,
        scrollTop: nav.scrollTop,
      };
    });
    expect(geometry).not.toBeNull();
    if (height >= 600) expect(geometry!.scrollTop).toBe(0);
    else expect(geometry!.scrollTop).toBeGreaterThan(0);
    expect(geometry!.settingsTop).toBeGreaterThanOrEqual(geometry!.navTop - 1);
    expect(geometry!.settingsBottom).toBeLessThanOrEqual(geometry!.navBottom + 1);
    await writeFile(info.outputPath('sidebar-geometry.json'), JSON.stringify(geometry, null, 2));
    if (height === 960)
      await page.screenshot({ path: info.outputPath('sidebar-initial-corrected.png') });
  });
}

for (const viewport of [
  { width: 1440, height: 960 },
  { width: 402, height: 874 },
  { width: 320, height: 480 },
  { width: 1366, height: 520 },
]) {
  test(`CP04 fixture recovery and 404 remain reachable ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    await page.goto('/forgot-password');
    await expect(page.getByRole('form', { name: 'Quên mật khẩu?' })).toBeVisible();
    const email = page.getByLabel('Email', { exact: true });
    await email.focus();
    await expect(email).toBeFocused();
    const send = page.getByRole('button', { name: 'Gửi hướng dẫn' });
    await send.scrollIntoViewIfNeeded();
    await expect(send).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
    if (viewport.width === 1440 || viewport.width === 402) {
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(scan.violations).toEqual([]);
      await page.screenshot({ path: info.outputPath('forgot.png'), fullPage: true });
    }

    for (const route of ['/verify-email', '/reset-password']) {
      await page.goto(route);
      await expect(page.getByRole('alert')).toContainText('không có mã token');
      await expect(
        page.getByRole('button', { name: /Xác minh email|Đặt lại mật khẩu/ }),
      ).toBeDisabled();
      const login = page.getByRole('form').getByRole('link', { name: 'Đăng nhập' });
      await login.scrollIntoViewIfNeeded();
      await expect(login).toBeInViewport();
    }

    await page.goto('/missing-cp04-review');
    await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
    await expect(page.locator('main')).toBeFocused();
    const home = page.getByRole('link', { name: 'Về trang chủ' });
    await home.scrollIntoViewIfNeeded();
    await expect(home).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
    if (viewport.width === 1440 || viewport.width === 402) {
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(scan.violations).toEqual([]);
      await page.screenshot({ path: info.outputPath('404.png'), fullPage: true });
    }
    await home.click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-flow="home"]')).toBeVisible();
  });
}

test('CP04 fixture reduced-motion trip drawer keeps keyboard recovery', async ({ page }, info) => {
  await page.setViewportSize({ width: 402, height: 600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/trips/11111111-1111-4111-8111-111111111111');
  const menu = page.getByRole('button', { name: 'Mở điều hướng chuyến đi' });
  await menu.click();
  const drawer = page.getByRole('dialog', { name: 'Điều hướng chuyến đi' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Đóng điều hướng chuyến đi' })).toBeFocused();
  const duration = await drawer.evaluate(
    (element) => Number.parseFloat(getComputedStyle(element).animationDuration) * 1000,
  );
  expect(duration).toBeLessThanOrEqual(0.01);
  await drawer.getByRole('link', { name: 'Cài đặt', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('drawer-reduced-motion.png') });
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(menu).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
    .not.toBe('hidden');
});
