import { expect, test } from '@playwright/test';

test('guest Home navigation and standalone login follow Web v2', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/');
  // Figma 930:6661 (Active=Guest): Trang chủ, Chuyến đi của tôi, Lên lịch + two CTAs.
  const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });
  await expect(nav.getByRole('link', { name: 'Trang chủ', exact: true })).toHaveAttribute(
    'href',
    '/',
  );
  await expect(nav.getByRole('link', { name: 'Chuyến đi của tôi', exact: true })).toHaveAttribute(
    'href',
    '/trips',
  );
  await expect(nav.getByRole('button', { name: 'Lên lịch', exact: true })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Bắt đầu miễn phí', exact: true })).toHaveAttribute(
    'href',
    '/register',
  );
  await page.goto('/login');
  await expect(page.getByRole('form', { name: 'Biểu mẫu đăng nhập' })).toBeVisible();
  await expect(page.locator('main[data-layout="auth"]')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toHaveCount(0);
});

for (const width of [1440, 402])
  test(`demo account opens User preview without API or persistent session ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    const api: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/')) api.push(request.url());
    });
    await page.goto('/login');
    await page.getByRole('button', { name: 'Điền tài khoản demo' }).click();
    await page.getByLabel('Mật khẩu', { exact: true }).fill('incorrect');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.getByText(/Email hoặc mật khẩu demo chưa đúng/)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByRole('button', { name: 'Điền tài khoản demo' }).click();
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-node-id="938:7830"]')).toBeVisible();
    await expect(page.getByText(/Phiên demo · Chỉ dữ liệu fixture/)).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Chuyến đi của tôi', exact: true }).last(),
    ).toBeVisible();
    // Every Web v2 Home section stays inside the shell gutter.
    for (const layout of ['home-hero', 'home-features', 'home-inspiration', 'home-footer']) {
      const bounds = await page.locator(`[data-layout="${layout}"]`).boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    }
    if (width === 1440) {
      for (const [layout, height] of [
        ['home-hero', 708],
        ['home-features', 332],
      ] as const) {
        const bounds = await page.locator(`[data-layout="${layout}"]`).boundingBox();
        expect(bounds).not.toBeNull();
        expect(Math.abs(bounds!.height - height)).toBeLessThanOrEqual(4);
      }
    }
    if (width <= 768) await page.getByRole('button', { name: /Mở điều hướng chính/ }).click();
    await page
      .getByRole('navigation', { name: 'Điều hướng chính' })
      .getByRole('link', { name: 'Chuyến đi của tôi', exact: true })
      .click();
    await expect(page).toHaveURL('/trips');
    await expect(
      page.getByRole('link', { name: 'Mở chuyến đi Đà Nẵng – Hội An', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Thoát phiên demo' }).click();
    await expect(page.locator('[data-node-id="933:7734"]')).toBeVisible();
    await page.goto('/login');
    await page.getByRole('button', { name: 'Điền tài khoản demo' }).click();
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.locator('[data-node-id="938:7830"]')).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-node-id="933:7734"]')).toBeVisible();
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
    expect(api).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });

for (const width of [2560, 1920, 1440, 1366, 1200, 1101, 1100, 1024, 820, 768, 402, 320])
  test(`Home sections stay inside the viewport at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width <= 402 ? 874 : 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    for (const layout of ['home-hero', 'home-features', 'home-inspiration', 'home-footer']) {
      const bounds = await page.locator(`[data-layout="${layout}"]`).boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    }

    const collage = await page.locator('[data-layout="home-collage"]').boundingBox();
    expect(collage).not.toBeNull();
    const hero = await page.locator('[data-layout="home-hero"]').boundingBox();
    const copy = await page.locator('[data-layout="home-hero-frame"]').boundingBox();
    const photo = await page.locator('[data-node-id="933:7799"]').boundingBox();
    expect(hero).not.toBeNull();
    expect(copy).not.toBeNull();
    expect(photo).not.toBeNull();
    if (width <= 1100) expect(copy!.y + copy!.height).toBeLessThanOrEqual(collage!.y - 35);
    if (width >= 1440) {
      // Figma W01 uses a centred 1296px hero with an inset photo on the right.
      expect(Math.abs(hero!.x - (width - 1296) / 2)).toBeLessThanOrEqual(1);
      expect(Math.abs(hero!.width - 1296)).toBeLessThanOrEqual(1);
      expect(Math.abs(copy!.x - hero!.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(copy!.y - hero!.y - 78)).toBeLessThanOrEqual(1);
      expect(Math.abs(photo!.x + photo!.width - hero!.x - hero!.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(photo!.y - hero!.y - 38)).toBeLessThanOrEqual(1);
      expect(Math.abs(photo!.width - 640)).toBeLessThanOrEqual(1);
      expect(Math.abs(photo!.height - 500)).toBeLessThanOrEqual(1);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({ path: info.outputPath('home-sections.png'), fullPage: true });
  });

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
  test(`Auth/public layout ${size.width}x${size.height}`, async ({ page }, info) => {
    await page.setViewportSize(size);
    const api: string[] = [];
    page.on('request', (r) => {
      if (new URL(r.url()).pathname.startsWith('/api/')) api.push(r.url());
    });
    for (const route of ['/', '/login', '/register', '/profile']) {
      await page.goto(route);
      if (route === '/') {
        await expect(page.getByRole('heading', { level: 1, name: /Cho những/ })).toBeVisible();
        await expect(page.locator('[data-node-id="933:7734"]')).toBeVisible();
        const guestCta = page.getByRole('link', { name: 'Bắt đầu ngay', exact: true });
        await expect(guestCta).toHaveAttribute('href', '/register');
        await expect(page.getByLabel('Trạng thái preview')).toHaveValue('guest');
        await expect(page.getByText('Phú Quốc – Hẹn với biển')).toHaveCount(0);
      } else if (route === '/profile')
        await expect(
          page.getByRole('heading', { level: 1, name: 'Tài khoản của tôi' }),
        ).toBeVisible();
      else
        await expect(
          page.getByRole('form', {
            name: route === '/login' ? 'Biểu mẫu đăng nhập' : 'Biểu mẫu đăng ký',
          }),
        ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      if (size.width === 1440 && route === '/') {
        const targets = [
          ['home-hero', 112, 708],
          ['home-features', 820, 332],
          ['home-inspiration', 1255, 430],
          ['home-footer', 1787, 382],
        ] as const;
        for (const [layout, y, height] of targets) {
          const bounds = await page.locator(`[data-layout="${layout}"]`).boundingBox();
          expect(bounds).not.toBeNull();
          expect(Math.abs(bounds!.y - y)).toBeLessThanOrEqual(4);
          expect(Math.abs(bounds!.height - height)).toBeLessThanOrEqual(4);
        }
        for (const [layout, target] of [
          ['home-collage', { x: 72, y: 112, width: 1296, height: 708 }],
        ] as const) {
          const bounds = await page.locator(`[data-layout="${layout}"]`).boundingBox();
          expect(bounds).not.toBeNull();
          for (const dimension of ['x', 'y', 'width', 'height'] as const)
            expect(Math.abs(bounds![dimension] - target[dimension])).toBeLessThanOrEqual(4);
        }
        const previewStyle = await page.addStyleTag({
          content: 'details.preview { display: none !important; }',
        });
        await expect(page).toHaveScreenshot('home-guest-1440.png', {
          animations: 'disabled',
          fullPage: true,
          maxDiffPixelRatio: 0.03,
          threshold: 0.3,
        });
        await previewStyle.evaluate((style) => style.parentNode?.removeChild(style));
      }
      if (size.width === 1440 && route !== '/') {
        const form = page.getByRole('form', {
          name:
            route === '/profile'
              ? 'Thông tin cá nhân'
              : route === '/login'
                ? 'Biểu mẫu đăng nhập'
                : 'Biểu mẫu đăng ký',
          exact: true,
        });
        const bounds = await form.boundingBox();
        expect(bounds).not.toBeNull();
        const target =
          route === '/login'
            ? { x: 834, width: 520 }
            : route === '/register'
              ? { x: 834, width: 520 }
              : { x: 48, y: 221, width: 560 };
        for (const dimension of ['x', 'width'] as const)
          expect(Math.abs(bounds![dimension] - target[dimension])).toBeLessThanOrEqual(4);
        if (route === '/login') {
          expect(bounds!.height).toBeGreaterThan(450);
          expect(bounds!.y).toBeGreaterThanOrEqual(48);
          expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(912);
        }
        if (route === '/profile') {
          expect(bounds!.height).toBeGreaterThan(400);
          expect(bounds!.height).toBeLessThan(650);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        size.width,
      );
      if (route === '/profile' && size.width <= 768) {
        await expect(page.getByLabel('Tên hiển thị')).toBeVisible();
      }
      const shellPreview = page.locator('main > details[data-preview="shell"] summary');
      await shellPreview.scrollIntoViewIfNeeded();
      // Desktop floats the fixture-only shell preview in the gutter; mobile keeps it in flow.
      if (size.width > 768) await expect(shellPreview).toBeInViewport();
      else expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
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
      const missing = await page
        .locator('img:visible')
        .evaluateAll((imgs) =>
          imgs
            .filter(
              (e) => !(e as HTMLImageElement).complete || !(e as HTMLImageElement).naturalWidth,
            )
            .map((e) => e.getAttribute('src')),
        );
      expect(missing).toEqual([]);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: info.outputPath(route === '/' ? 'home.png' : route.slice(1) + '.png'),
        fullPage: true,
      });
    }
    expect(api).toEqual([]);
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  });

test('registration validates and remains unavailable without session or redirect', async ({
  page,
}) => {
  await page.goto('/register');
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
  await page.getByLabel('Email', { exact: true }).fill('preview@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('a long preview password');
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill('a long preview password');
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page.locator('[data-registration-step="details"]')).toBeVisible();
  await expect(page.getByLabel('Họ và tên')).toBeFocused();
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page.getByLabel('Họ và tên')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Họ và tên').fill('Người xem trước');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(
    page.getByText(/Bản xem trước chưa hỗ trợ tạo tài khoản hoặc đăng nhập thật/),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/register$/);
  await page.locator('[data-preview="auth-form"] summary').click();
  await page.getByLabel('Trạng thái biểu mẫu').selectOption('pending');
  await expect(page.getByRole('button', { name: 'Tạo tài khoản' })).toBeDisabled();
  await page.getByLabel('Trạng thái biểu mẫu').selectOption('unknown');
  await expect(page.getByText(/Chưa có tài khoản hoặc phiên nào được xác nhận/)).toBeVisible();
});

test('mobile profile keeps draft through error and never reports saved', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto('/profile');
  await page.getByLabel('Tên hiển thị').fill('Bản nháp local');
  await page.locator('[data-preview="profile"] summary').click();
  for (const state of ['error', 'success'])
    await page.getByLabel('Trạng thái hồ sơ').selectOption(state);
  await expect(page.getByLabel('Tên hiển thị')).toHaveValue('Bản nháp local');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByText(/Chưa lưu được thay đổi/)).toBeVisible();
  // A25: the version moved from visible text to data-profile-version; same behavioural check.
  await expect(page.locator('[data-preview="profile"]')).toHaveAttribute(
    'data-profile-version',
    '1',
  );
  await page.getByText('Phiên đăng nhập', { exact: true }).click();
  await expect(page.getByText('Phiên đăng nhập 1')).toBeVisible();
});
