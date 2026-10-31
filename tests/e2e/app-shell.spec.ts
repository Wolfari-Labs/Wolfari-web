import { expect, test, type Page } from '@playwright/test';
const tripPath = '/trips/11111111-1111-4111-8111-111111111111';
for (const width of [1440, 402])
  test(`workspace projection sections use real routes ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(tripPath);
    await expect(page.locator('[data-flow="trip-overview"]')).toBeVisible();
    if (width <= 768) await page.getByRole('button', { name: 'Mở điều hướng chuyến đi' }).click();
    await page.getByRole('link', { name: 'Packing list', exact: true }).click();
    await expect(page.locator('[data-flow="packing-read"]')).toBeVisible();
    await expect(page.locator('[data-flow="trip-overview"]')).toHaveCount(0);
    await expect(page).toHaveURL(tripPath + '/packing');
    await expect(page.locator('main')).toBeFocused();
    if (width <= 768) await page.getByRole('button', { name: 'Mở điều hướng chuyến đi' }).click();
    if (width <= 768) {
      await page
        .getByRole('dialog', { name: 'Điều hướng chuyến đi' })
        .getByRole('link', { name: 'Tổng quan chuyến đi', exact: true })
        .click();
    } else {
      await page
        .getByRole('navigation', { name: 'Điều hướng chuyến đi' })
        .getByRole('link', { name: 'Tổng quan chuyến đi', exact: true })
        .click();
    }
    await expect(page.locator('[data-flow="trip-overview"]')).toBeVisible();
    await expect(page.locator('main')).toBeFocused();
  });
async function expectRouteContent(page: Page, route: string) {
  if (route === '/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Cho những|Đi đâu/);
  else if (route === '/login' || route === '/register')
    await expect(
      page.getByRole('form', {
        name: route === '/login' ? 'Biểu mẫu đăng nhập' : 'Biểu mẫu đăng ký',
      }),
    ).toBeVisible();
  else if (route === '/profile')
    await expect(page.getByRole('heading', { level: 1, name: 'Tài khoản của tôi' })).toBeVisible();
  else if (route.endsWith('/plan')) {
    await expect(page.locator('[data-flow="plan-preview"]')).toBeVisible();
    await expect(
      page.locator('main').getByRole('heading', { name: 'Lịch trình', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('list', { name: 'Các hoạt động trong ngày' })).toBeVisible();
  } else if (route.endsWith('/members'))
    await expect(page.locator('[data-flow="members-preview"]')).toBeVisible();
  else if (/^\/trips\/[^/]+$/.test(route))
    await expect(page.locator('[data-flow="trip-overview"]')).toBeVisible();
  else await expect(page.getByText('Không gian làm việc', { exact: true })).toBeVisible();
}
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
  // Below-fold images intentionally lazy-load; inspect each after scrolling it
  // into view, not merely because it has non-zero layout dimensions.
  for (const img of await page.locator('img:visible').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        img.evaluate(
          (e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
  await page.evaluate(() => {
    scrollTo(0, 0);
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  });
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
      // HTMLImageElement rounds intrinsic fractional SVG dimensions to integer pixels.
      expect(Math.round(image.width)).toBe(image.naturalWidth);
      expect(Math.round(image.height)).toBe(image.naturalHeight);
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
    await expectRouteContent(page, tripPath);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const desktop = size.width > 768;
    const header = page.locator('header:visible');
    await expect(header).toHaveCount(1);
    expect(Math.round((await header.boundingBox())!.height)).toBe(desktop ? 76 : 72);
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
        .locator('a,button')
        .evaluateAll((elements) =>
          elements.map((element) => element.getBoundingClientRect().height),
        );
      for (const height of navTargets) expect(height).toBeGreaterThanOrEqual(44);
      await nav.getByRole('link', { name: 'Cài đặt', exact: true }).scrollIntoViewIfNeeded();
      const navBox = (await nav.boundingBox())!,
        settings = (await nav.getByRole('link', { name: 'Cài đặt', exact: true }).boundingBox())!;
      expect(settings.y + settings.height).toBeLessThanOrEqual(navBox.y + navBox.height + 1);
      await page.screenshot({ path: info.outputPath('desktop-expanded.png') });
      await toggle.focus();
      await page.keyboard.press('Enter');
      // The collapse control changes state immediately, while its existing width
      // transition finishes on the next frames in the built preview.
      await expect.poll(async () => Math.round((await side.boundingBox())!.width)).toBe(72);
      await expect(page.getByRole('button', { name: 'Mở rộng thanh điều hướng' })).toBeFocused();
      await page.screenshot({ path: info.outputPath('desktop-collapsed.png') });
      await page.keyboard.press('Enter');
      await fillMain(page);
      await page.getByRole('button', { name: 'Acceptance content end' }).click();
      await expect
        .poll(() => page.locator('main').evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);
      expect(await page.evaluate(() => scrollY)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
        true,
      );
      await nav.getByRole('link', { name: 'Thành viên', exact: true }).click();
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
      expect(Math.round(logo.width)).toBe(size.width <= 360 ? 112 : 130);
      expect(Math.round(logo.x)).toBe(16);
      const menu = page.getByRole('button', { name: 'Mở điều hướng chuyến đi' });
      const account = header.getByRole('link', { name: /Hồ sơ cá nhân/ });
      expect((await account.boundingBox())!.x).toBeGreaterThan(logo.x + logo.width);
      expect((await menu.boundingBox())!.x).toBeGreaterThan(
        (await account.boundingBox())!.x + (await account.boundingBox())!.width,
      );
      await expect(menu).toHaveText('Menu');
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
      expect(Math.round((await drawer.boundingBox())!.width)).toBe(
        Math.round(Math.min(300, size.width * 0.86)),
      );
      await expect(drawer.getByRole('button', { name: 'Đóng điều hướng chuyến đi' })).toBeVisible();
      await expect(drawer.getByRole('img', { name: 'Wolfari' })).toBeVisible();
      const settings = drawer.getByRole('link', { name: 'Cài đặt', exact: true });
      await settings.scrollIntoViewIfNeeded();
      const settingBox = (await settings.boundingBox())!,
        drawerBox = (await drawer.boundingBox())!;
      expect(settingBox.y + settingBox.height).toBeLessThanOrEqual(drawerBox.y + drawerBox.height);
      await drawer.getByRole('link', { name: 'Lịch trình', exact: true }).click();
      await expect(page).toHaveURL(tripPath + '/plan');
      await expect(drawer).not.toBeVisible();
      // Drawer focus and URL changes precede the lazy route's commit. Wait for
      // Plan content before appending the probe, otherwise navigation resets
      // the scroll after the probe has already been clicked.
      await expectRouteContent(page, tripPath + '/plan');
      await loadedAssets(page);
      await expect(page.locator('main')).toBeFocused();
      await page.screenshot({ path: info.outputPath('mobile.png') });
      await fillMain(page);
      await page.getByRole('button', { name: 'Acceptance content end' }).click();
      await expect
        .poll(() =>
          page.evaluate(() => ({
            overflow: getComputedStyle(document.body).overflow,
            scrollY,
          })),
        )
        .toMatchObject({
          overflow: expect.not.stringContaining('hidden'),
          scrollY: expect.any(Number),
        });
      // Responsive trip layouts may expose the document scroll or retain the
      // scroll container on main; either proves the appended content is reachable.
      await expect
        .poll(() =>
          page.evaluate(() =>
            Math.max(window.scrollY, document.getElementById('main-content')?.scrollTop ?? 0),
          ),
        )
        .toBeGreaterThan(0);
      await expect(page.getByRole('navigation', { name: 'Điều hướng Mobile' })).toHaveCount(0);
    }
    expect(calls).toEqual([]);
    expect(
      await page.evaluate(() => ({
        localStorageKeys: Object.keys(localStorage),
        sessionStorageLength: sessionStorage.length,
      })),
    ).toMatchObject({
      localStorageKeys: expect.arrayContaining([]),
      sessionStorageLength: 0,
    });
    expect(
      await page.evaluate(() =>
        Object.keys(localStorage).every((key) => key.startsWith('wolfari:plan-draft:v1:')),
      ),
    ).toBe(true);
    await page.goto('/missing-shell-page');
    await expect(page).toHaveTitle(/Wolfari/);
    await expect(page.locator('main')).toBeFocused();
    await expect(page.locator('main').getByRole('link', { name: /trang ch/i })).toBeVisible();
    await expect(page.getByText('Không tìm thấy trang', { exact: true })).toBeVisible();
    await page.goto('/trips/22222222-2222-4222-8222-222222222222');
    await expect(page.getByText('Không tìm thấy nội dung', { exact: true })).toBeVisible();
  });

test('mobile scroll waits for the lazy Plan route after drawer navigation', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  let releasePlan!: () => void;
  const planGate = new Promise<void>((resolve) => {
    releasePlan = resolve;
  });
  const planModule = /\/(?:src\/features\/plan\/PlanPage\.tsx|assets\/PlanPage-[^/]+\.js)(?:\?|$)/;
  await page.route(planModule, async (route) => {
    await planGate;
    await route.continue();
  });
  try {
    await page.goto(tripPath);
    await expectRouteContent(page, tripPath);
    await page.getByRole('button', { name: 'Mở điều hướng chuyến đi' }).click();
    const drawer = page.getByRole('dialog', { name: 'Điều hướng chuyến đi' });
    const planRequest = page.waitForRequest((request) => planModule.test(request.url()));
    await drawer.getByRole('link', { name: 'Lịch trình', exact: true }).click();
    await planRequest;
    await expect(drawer).not.toBeVisible();
    // Reproduce the failed CI screenshot: the drawer is gone, but the old
    // Overview still renders while the Plan module is in flight.
    await expectRouteContent(page, tripPath);
    releasePlan();
    await expectRouteContent(page, tripPath + '/plan');
    await loadedAssets(page);
    await expect(page.locator('main')).toBeFocused();
    await fillMain(page);
    const end = page.getByRole('button', { name: 'Acceptance content end' });
    await end.click();
    await expect(end).toBeInViewport();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .not.toContain('hidden');
  } finally {
    releasePlan();
  }
});

test('drawer traps focus, closes with Escape/backdrop, and keeps background scroll locked', async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 600 });
  await page.goto(tripPath);
  await expectRouteContent(page, tripPath);
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
    expect(
      await page.evaluate(
        () => !!document.activeElement?.closest('[role="dialog"][data-state="open"]'),
      ),
    ).toBe(true);
  }
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(menu).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
  await menu.click();
  await page.mouse.click(390, 200);
  await expect(drawer).not.toBeVisible();
  await expect(menu).toBeFocused();
  await menu.click();
  await close.click();
  await expect(drawer).not.toBeVisible();
  await expect(menu).toBeFocused();
  await menu.click();
  await drawer.getByRole('link', { name: 'Tổng quan chuyến đi', exact: true }).click();
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
    } else await expectRouteContent(page, route);
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
      await expectRouteContent(page, route);
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

test('CP04 Web Home guest menu and 404 recovery keep public routes distinct', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto('/');
  for (const section of ['hero', 'features', 'about', 'inspiration', 'footer'])
    await expect(page.locator(`[data-layout="home-${section}"]`)).toBeVisible();
  await expect(page.getByText(/Trên trình duyệt máy tính hoặc điện thoại/)).toBeVisible();
  const header = page.locator('header:visible').first();
  const logo = (await header.getByRole('img', { name: 'Wolfari' }).boundingBox())!;
  const menu = header.getByRole('button', { name: 'Mở điều hướng chính' });
  expect(Math.round(logo.x)).toBe(16);
  expect((await menu.boundingBox())!.x).toBeGreaterThan(logo.x + logo.width);
  await expect(header.getByRole('link', { name: 'Đăng nhập' })).toHaveCount(0);
  await menu.click();
  const drawer = page.getByRole('dialog', { name: 'Điều hướng chính' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Đóng điều hướng chính' })).toBeFocused();
  const nav = drawer.getByRole('navigation', { name: 'Điều hướng chính' });
  await expect(nav.getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Đăng ký' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Quỹ nhóm' })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('cp04-home-guest-menu-402.png') });
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(menu).toBeFocused();

  await page.goto('/missing-shell-page');
  await expect(page.locator('main')).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('cp04-404-402.png') });
  await page.locator('main').getByRole('link', { name: 'Về trang chủ' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1, name: /Cho những/ })).toBeVisible();
});

test('CP04 authenticated Web Home keeps account and inbox access beside Menu', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Điền tài khoản demo' }).click();
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL('/');
  const header = page.locator('header:visible').first();
  await expect(header.getByRole('button', { name: 'Thông báo' })).toBeVisible();
  await expect(header.getByRole('link', { name: /Hồ sơ cá nhân/ })).toBeVisible();
  const menu = header.getByRole('button', { name: 'Mở điều hướng chính' });
  await expect(menu).toHaveText('Menu');
  expect((await menu.boundingBox())!.x).toBeGreaterThan(
    (await header.getByRole('link', { name: /Hồ sơ cá nhân/ }).boundingBox())!.x,
  );
  await page.screenshot({ path: info.outputPath('cp04-home-user-402.png') });
  await menu.click();
  await expect(
    page
      .getByRole('dialog', { name: 'Điều hướng chính' })
      .getByRole('link', { name: 'Chuyến đi của tôi' }),
  ).toBeVisible();
});

test('CP04 Web trip drawer follows the approved navigation composition', async ({ page }, info) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto(tripPath + '/fund');
  const menu = page.getByRole('button', { name: 'Mở điều hướng chuyến đi' });
  await menu.click();
  const drawer = page.getByRole('dialog', { name: 'Điều hướng chuyến đi' });
  await expect(drawer.getByRole('img', { name: 'Wolfari' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Đóng điều hướng chuyến đi' })).toBeFocused();
  const nav = drawer.getByRole('navigation', { name: 'Điều hướng chuyến đi' });
  await expect(nav.getByRole('link')).toHaveCount(9);
  await expect(nav.getByRole('link', { name: 'Quỹ nhóm' })).toHaveAttribute('aria-current', 'page');
  await expect(drawer.locator('img[class*="drawerMascot"]')).toBeVisible();
  await page.screenshot({ path: info.outputPath('cp04-trip-menu-402.png') });
  await drawer.getByRole('button', { name: 'Đóng điều hướng chuyến đi' }).click();
  await expect(menu).toBeFocused();
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
