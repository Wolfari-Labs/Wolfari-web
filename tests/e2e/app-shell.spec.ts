import { expect, test, type Page } from '@playwright/test';
const tripPath = '/trips/11111111-1111-4111-8111-111111111111';
async function choose(page: Page, scenario: string) {
  const controls = page.locator('details[data-preview="shell"]');
  if (!(await controls.getAttribute('open'))) {
    if (!(await controls.evaluate((element) => (element as HTMLDetailsElement).open)))
      await controls.locator('summary').click();
  }
  await page.getByLabel('Trạng thái preview').selectOption(scenario);
}
async function loadedAssets(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const images = await page.locator('img:visible').evaluateAll((elements) =>
    elements.map((element) => {
      const image = element as HTMLImageElement,
        box = image.getBoundingClientRect();
      return {
        source: image.getAttribute('src'),
        loaded: image.complete && image.naturalWidth > 0,
        width: box.width,
        height: box.height,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      };
    }),
  );
  expect(images.length).toBeGreaterThan(0);
  for (const image of images) {
    expect(image.loaded, image.source ?? 'asset').toBe(true);
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
    expect(image.source).not.toContain('figma.com');
    if (image.source?.includes('.svg') || image.source?.startsWith('data:image/svg+xml')) {
      expect(image.width).toBeCloseTo(image.naturalWidth, 0);
      expect(image.height).toBeCloseTo(image.naturalHeight, 0);
    }
  }
}
async function fillMain(page: Page) {
  await page.locator('main').evaluate((element) => {
    const content = document.createElement('section');
    for (let i = 0; i < 70; i++) {
      const paragraph = document.createElement('p');
      paragraph.textContent = 'Scroll boundary acceptance content ' + i;
      content.append(paragraph);
    }
    const end = document.createElement('button');
    end.textContent = 'Acceptance content end';
    content.append(end);
    element.append(content);
  });
}
const sizes = [
  { width: 1440, height: 800 },
  { width: 1440, height: 960 },
  { width: 1366, height: 600 },
  { width: 1366, height: 520 },
  { width: 1024, height: 600 },
  { width: 820, height: 600 },
  { width: 768, height: 1024 },
  { width: 402, height: 874 },
  { width: 320, height: 480 },
];
for (const size of sizes)
  test('workspace boundaries ' + size.width + '×' + size.height, async ({ page }, info) => {
    await page.setViewportSize(size);
    const calls: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/')) calls.push(request.url());
    });
    await page.goto(tripPath);
    await expect(page.getByText('Không gian làm việc', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const desktop = size.width > 768;
    const header = page.locator('header:visible');
    await expect(header).toHaveCount(1);
    expect(Math.round((await header.boundingBox())!.height)).toBe(desktop ? 76 : 54);
    const headerTargets = await header
      .locator('button:visible, a:visible')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { width: box.width, height: box.height };
        }),
      );
    for (const target of headerTargets) {
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    }
    await loadedAssets(page);
    if (desktop) {
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
        true,
      );
      const side = page.getByRole('complementary');
      await expect(header.getByRole('link', { name: /Hồ sơ cá nhân/ })).toBeVisible();
      expect(Math.round((await side.boundingBox())!.width)).toBe(220);
      const toggle = page.getByRole('button', { name: 'Thu gọn thanh điều hướng' });
      const bounds = (await toggle.boundingBox())!;
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(size.height);
      const nav = side.getByRole('navigation');
      const navTargets = await nav
        .getByRole('button')
        .evaluateAll((elements) =>
          elements.map((element) => element.getBoundingClientRect().height),
        );
      for (const height of navTargets) expect(height).toBeGreaterThanOrEqual(44);
      await nav.getByRole('button', { name: 'Cài đặt', exact: true }).scrollIntoViewIfNeeded();
      const navBox = (await nav.boundingBox())!,
        settings = (await nav.getByRole('button', { name: 'Cài đặt', exact: true }).boundingBox())!;
      expect(settings.y + settings.height).toBeLessThanOrEqual(navBox.y + navBox.height + 1);
      await page.screenshot({ path: info.outputPath('desktop-expanded.png') });
      await toggle.focus();
      await page.keyboard.press('Enter');
      expect(Math.round((await side.boundingBox())!.width)).toBe(72);
      await expect(page.getByRole('button', { name: 'Mở rộng thanh điều hướng' })).toBeFocused();
      await page.screenshot({ path: info.outputPath('desktop-collapsed.png') });
      await page.keyboard.press('Enter');
      await fillMain(page);
      await page.getByRole('button', { name: 'Acceptance content end' }).click();
      expect(await page.locator('main').evaluate((element) => element.scrollTop)).toBeGreaterThan(
        0,
      );
      expect(await page.evaluate(() => scrollY)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
        true,
      );
      await nav.getByRole('button', { name: 'Thành viên', exact: true }).click();
      await expect(page).toHaveURL(tripPath + '/members');
      await expect(page.getByRole('heading', { name: 'Thành viên', exact: true })).toBeVisible();
      expect(await page.locator('main').evaluate((element) => element.scrollTop)).toBe(0);
      await page.goBack();
      await expect(page).toHaveURL(tripPath);
      await expect(
        page.getByRole('heading', { name: 'Tổng quan chuyến đi', exact: true }),
      ).toBeVisible();
    } else {
      const logo = (await header.locator('img[alt="Wolfari"]').boundingBox())!;
      expect(Math.round(logo.x + logo.width / 2)).toBe(size.width / 2);
      expect(Math.round(logo.width)).toBe(112);
      const menu = page.getByRole('button', { name: 'Mở điều hướng chuyến đi' });
      const account = header.getByRole('link', { name: /Hồ sơ cá nhân/ });
      expect((await menu.boundingBox())!.x).toBeLessThan(logo.x);
      expect((await account.boundingBox())!.x).toBeGreaterThan(logo.x + logo.width);
      await expect(header.getByRole('heading')).toHaveCount(0);
      const title = page
        .locator('main')
        .getByRole('heading', { name: 'Tổng quan chuyến đi', exact: true });
      expect((await title.boundingBox())!.y).toBeGreaterThanOrEqual(
        (await header.boundingBox())!.height,
      );
      await expect(page.getByRole('navigation', { name: 'Điều hướng chuyến đi' })).toHaveCount(0);
      await menu.click();
      const drawer = page.getByRole('dialog', { name: 'Điều hướng chuyến đi' });
      await expect(drawer).toBeVisible();
      expect((await drawer.boundingBox())!.width).toBeLessThanOrEqual(280);
      const settings = drawer.getByRole('button', { name: 'Cài đặt', exact: true });
      await settings.scrollIntoViewIfNeeded();
      const settingBox = (await settings.boundingBox())!,
        drawerBox = (await drawer.boundingBox())!;
      expect(settingBox.y + settingBox.height).toBeLessThanOrEqual(drawerBox.y + drawerBox.height);
      await drawer.getByRole('button', { name: 'Lịch trình', exact: true }).click();
      await expect(page).toHaveURL(tripPath + '/plan');
      await expect(drawer).not.toBeVisible();
      await expect(page.locator('main')).toBeFocused();
      await page.screenshot({ path: info.outputPath('mobile.png') });
      await fillMain(page);
      await page.getByRole('button', { name: 'Acceptance content end' }).click();
      expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
      await expect(page.getByRole('navigation', { name: 'Điều hướng Mobile' })).toHaveCount(0);
    }
    expect(calls).toEqual([]);
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
    await page.goto('/missing-shell-page');
    await expect(page.getByText('Không tìm thấy trang', { exact: true })).toBeVisible();
    await page.goto('/trips/22222222-2222-4222-8222-222222222222');
    await expect(page.getByText('Không tìm thấy nội dung', { exact: true })).toBeVisible();
  });

test('drawer traps focus, closes with Escape/backdrop, and keeps background scroll locked', async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 600 });
  await page.goto(tripPath);
  await expect(page.getByText('Không gian làm việc', { exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Đến nội dung chính' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const menu = page.getByRole('button', { name: 'Mở điều hướng chuyến đi' });
  await menu.click();
  const drawer = page.getByRole('dialog'),
    close = drawer.getByRole('button', { name: 'Đóng điều hướng chuyến đi' });
  await expect(close).toBeFocused();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog[open]'))).toBe(true);
  }
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(menu).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  await menu.click();
  await page.mouse.click(390, 200);
  await expect(drawer).not.toBeVisible();
  await expect(menu).toBeFocused();
  await menu.click();
  await close.click();
  await expect(drawer).not.toBeVisible();
  await expect(menu).toBeFocused();
  await menu.click();
  await drawer.getByRole('button', { name: 'Tổng quan chuyến đi', exact: true }).click();
  await expect(page).toHaveURL(tripPath);
  await expect(drawer).not.toBeVisible();
  await expect(page.locator('main')).toBeFocused();
});

const routes = [
  '/',
  '/login',
  '/register',
  '/trips',
  tripPath,
  tripPath + '/plan',
  tripPath + '/members',
  '/profile',
  '/admin',
];
for (const route of routes)
  test('shared state contract ' + route, async ({ page }) => {
    await page.setViewportSize({ width: 402, height: 874 });
    await page.goto(route);
    await expect(page.getByText('UI preview · Dữ liệu minh họa', { exact: true })).toBeVisible();
    if (route === '/admin') {
      await expect(page.getByText('Bạn không có quyền truy cập', { exact: true })).toBeVisible();
      await choose(page, 'admin');
    } else await choose(page, 'success');
    if (route === '/trips') {
      await expect(
        page.getByRole('heading', { level: 1, name: 'Chuyến đi của tôi' }),
      ).toBeVisible();
      await expect(page.locator('article[data-trip-id]')).toHaveCount(6);
    } else await expect(page.getByText('Không gian làm việc', { exact: true })).toBeVisible();
    if (
      route === '/trips' ||
      route === '/profile' ||
      route.startsWith('/trips/') ||
      route === '/admin'
    ) {
      await choose(page, 'guest');
      await expect(page.getByText('Bạn không có quyền truy cập', { exact: true })).toBeVisible();
      await expect(page.getByText('Không gian làm việc', { exact: true })).toHaveCount(0);
      if (route === '/trips') await expect(page.locator('article[data-trip-id]')).toHaveCount(0);
      await choose(page, route === '/admin' ? 'admin' : 'success');
    }
    for (const [scenario, message] of [
      ['empty', 'Chưa có nội dung'],
      ['error', 'Chưa thể tải nội dung'],
      ['forbidden', 'Bạn không có quyền truy cập'],
      ['not-found', 'Không tìm thấy nội dung'],
      ['conflict', 'Dữ liệu đã thay đổi'],
      ['unavailable', 'Chức năng chưa khả dụng'],
      ['loading', 'Đang tải…'],
    ]) {
      await choose(page, scenario!);
      await expect(page.getByText(message!, { exact: true })).toBeVisible();
      await expect(page.getByText('Không gian làm việc', { exact: true })).toHaveCount(0);
      if (scenario === 'conflict') {
        await page.getByRole('button', { name: 'Tải lại' }).click();
        await expect(page.getByText(message!, { exact: true })).toBeVisible();
      }
    }
    if (route.startsWith('/trips/')) {
      await choose(page, 'forbidden-snapshot');
      await expect(page.getByText('Bạn không có quyền truy cập', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Mở điều hướng chuyến đi' }).click();
      const drawer = page.getByRole('dialog');
      for (const button of await drawer.getByRole('navigation').getByRole('button').all())
        await expect(button).toBeDisabled();
      await page.keyboard.press('Escape');
    }
  });

for (const size of [
  { width: 1440, height: 800 },
  { width: 1024, height: 520 },
  { width: 402, height: 600 },
]) {
  test('Admin permission and shell ' + size.width + '×' + size.height, async ({ page }, info) => {
    await page.setViewportSize(size);
    await page.goto('/admin');
    await expect(page.getByText('Bạn không có quyền truy cập', { exact: true })).toBeVisible();
    await choose(page, 'admin');
    await expect(page.getByText('Không gian làm việc', { exact: true })).toBeVisible();
    await loadedAssets(page);
    if (size.width > 768) {
      await page.screenshot({ path: info.outputPath('admin.png') });
      expect((await page.getByRole('complementary').boundingBox())!.width).toBe(248);
      expect((await page.locator('header:visible').boundingBox())!.height).toBe(72);
      await page
        .getByRole('navigation', { name: 'Điều hướng Admin' })
        .getByRole('button', { name: 'Tài khoản', exact: true })
        .click();
      await expect(page.getByRole('heading', { name: 'Tài khoản', exact: true })).toBeVisible();
      await fillMain(page);
      await page.getByRole('button', { name: 'Acceptance content end' }).click();
      expect(await page.locator('main').evaluate((element) => element.scrollTop)).toBeGreaterThan(
        0,
      );
      expect(await page.evaluate(() => scrollY)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
        true,
      );
    } else {
      await page.getByRole('button', { name: 'Mở điều hướng admin' }).click();
      await page.screenshot({ path: info.outputPath('admin-drawer.png') });
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Tài khoản', exact: true })
        .click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByRole('heading', { name: 'Tài khoản', exact: true })).toBeVisible();
    }
    await expect(page).toHaveURL('/admin');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await choose(page, 'success');
    await expect(page.getByText('Bạn không có quyền truy cập', { exact: true })).toBeVisible();
    await expect(page.getByText('Không gian làm việc', { exact: true })).toHaveCount(0);
  });
}

test('Guest public/auth pages have responsive header and natural scrolling', async ({ page }) => {
  for (const size of [
    { width: 820, height: 600 },
    { width: 402, height: 600 },
  ]) {
    await page.setViewportSize(size);
    for (const route of ['/', '/login', '/register']) {
      await page.goto(route);
      await choose(page, 'guest');
      await expect(page.getByText('Không gian làm việc', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await loadedAssets(page);
      await fillMain(page);
      await page.getByRole('button', { name: 'Acceptance content end' }).click();
      expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
    }
  }
});

test('guest assets and expanded sidebar decorations retain source geometry', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  await choose(page, 'guest');
  await expect(page.getByRole('link', { name: 'Đăng nhập', exact: true })).toBeVisible();
  expect((await page.locator('header:visible img[alt="Wolfari"]').boundingBox())!.width).toBe(155);
  await loadedAssets(page);
  await page.screenshot({ path: info.outputPath('guest.png') });
  await page.goto(tripPath + '/plan');
  await expect(page.getByRole('link', { name: 'Lên lịch', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(
    page.getByRole('link', { name: 'Chuyến đi của tôi', exact: true }),
  ).not.toHaveAttribute('aria-current', 'page');
  expect((await page.locator('img[class*="readingMascot"]').boundingBox())!.width).toBe(166);
  const deco = (await page.locator('img[class*="routeDecoration"]').boundingBox())!;
  expect(deco.width).toBe(145);
  expect(deco.height).toBe(40);
});
