import { expect, test } from '@playwright/test';

test('guest header opens the matching Home sections from Home and login', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  for (const [start, label, target] of [
    ['/', 'Tính năng', 'home-features'],
    ['/login', 'Về Wolfari', 'home-about'],
  ] as const) {
    await page.goto(start);
    await page
      .getByRole('navigation', { name: 'Điều hướng chính' })
      .getByRole('link', { name: label, exact: true })
      .click();
    await expect(page).toHaveURL(`/#${target}`);
    await expect(page.locator(`#${target}`)).toBeInViewport();
    await expect(page.locator('[data-node-id="3:28"]')).toBeVisible();
  }
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
    await expect(page.locator('[data-node-id="298:1642"]')).toBeVisible();
    await expect(page.getByText(/Phiên demo · Chỉ dữ liệu fixture/)).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Chuyến đi của tôi', exact: true }).last(),
    ).toBeVisible();
    for (const layout of [
      'home-hero',
      'home-features',
      'home-about',
      'home-inspiration',
      'home-footer',
    ]) {
      const bounds = await page.locator(`[data-layout="${layout}"]`).boundingBox();
      expect(bounds).not.toBeNull();
      expect(Math.abs(bounds!.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(bounds!.width - width)).toBeLessThanOrEqual(1);
    }
    await expect(page.locator('[data-cloud-layer]')).toHaveCount(5);
    const userTopCloud = await page
      .locator('[data-layout="home-hero"] [data-cloud-layer="top"]')
      .boundingBox();
    expect(userTopCloud).not.toBeNull();
    expect(Math.abs(userTopCloud!.height - (390 * width) / 1440)).toBeLessThanOrEqual(1);
    if (width === 1440) {
      for (const [layout, height] of [
        ['home-hero', 548],
        ['home-features', 442],
        ['home-about', 432],
        ['home-inspiration', 390],
        ['home-footer', 256],
      ] as const) {
        const bounds = await page.locator(`[data-layout="${layout}"]`).boundingBox();
        expect(bounds).not.toBeNull();
        expect(Math.abs(bounds!.height - height)).toBeLessThanOrEqual(4);
      }
    }
    if (width <= 768) await page.getByRole('button', { name: 'Mở điều hướng chính' }).click();
    await page
      .getByRole('navigation', { name: 'Điều hướng chính' })
      .getByRole('link', { name: 'Chuyến đi của tôi', exact: true })
      .click();
    await expect(page).toHaveURL('/trips');
    await expect(
      page.getByRole('link', { name: 'Mở chuyến đi Đà Nẵng – Hội An', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Thoát phiên demo' }).click();
    await expect(page.locator('[data-node-id="3:28"]')).toBeVisible();
    await page.goto('/login');
    await page.getByRole('button', { name: 'Điền tài khoản demo' }).click();
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.locator('[data-node-id="298:1642"]')).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-node-id="3:28"]')).toBeVisible();
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
    expect(api).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });

for (const width of [2560, 1920, 1440, 1366, 1200, 1101, 1100, 1024, 820, 768, 402, 320])
  test(`Home cloud layers cover the viewport at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width <= 402 ? 874 : 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    for (const layout of [
      'home-hero',
      'home-features',
      'home-about',
      'home-inspiration',
      'home-footer',
    ]) {
      const bounds = await page.locator(`[data-layout="${layout}"]`).boundingBox();
      expect(bounds).not.toBeNull();
      expect(Math.abs(bounds!.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(bounds!.width - width)).toBeLessThanOrEqual(1);
    }

    const cloudLayers = page.locator('[data-cloud-layer]');
    expect(await cloudLayers.count()).toBe(5);
    for (let index = 0; index < (await cloudLayers.count()); index += 1) {
      const layer = cloudLayers.nth(index);
      const bounds = await layer.boundingBox();
      const image = await layer.locator('img').evaluate((element) => {
        const target = element as HTMLImageElement;
        return {
          naturalWidth: target.naturalWidth,
          naturalHeight: target.naturalHeight,
          objectFit: getComputedStyle(target).objectFit,
        };
      });
      expect(bounds).not.toBeNull();
      expect(Math.abs(bounds!.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(bounds!.width - width)).toBeLessThanOrEqual(1);
      expect(image.objectFit).toBe('cover');
      expect(image.naturalWidth / image.naturalHeight).toBe(3);
      const scale = Math.max(
        bounds!.width / image.naturalWidth,
        bounds!.height / image.naturalHeight,
      );
      const paintedWidth = image.naturalWidth * scale;
      const paintedHeight = image.naturalHeight * scale;
      expect(paintedWidth + 0.5).toBeGreaterThanOrEqual(bounds!.width);
      expect(paintedHeight + 0.5).toBeGreaterThanOrEqual(bounds!.height);
      expect(paintedWidth / paintedHeight).toBeCloseTo(3, 10);
    }

    for (const [selector, referenceHeight] of [
      ['[data-layout="home-hero"] [data-cloud-layer="top"]', 390],
      ['[data-layout="home-hero"] [data-cloud-layer="lower"]', 490],
      ['[data-layout="home-features"] [data-cloud-layer="lower"]', 292],
      ['[data-layout="home-about"] [data-cloud-layer="lower"]', 282],
      ['[data-layout="home-inspiration"] [data-cloud-layer="lower"]', 240],
    ] as const) {
      const bounds = await page.locator(selector).boundingBox();
      expect(bounds).not.toBeNull();
      expect(Math.abs(bounds!.height - (referenceHeight * width) / 1440)).toBeLessThanOrEqual(1);
    }

    const footerBackground = await page.locator('[data-layout="home-footer"]').evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        size: style.backgroundSize.split(',')[0]?.trim() ?? '',
        positionY: Number.parseFloat(style.backgroundPositionY.split(',')[0] ?? ''),
      };
    });
    expect(footerBackground.size).toBe('100% auto');
    if (width > 1000)
      expect(Math.abs(footerBackground.positionY + (200 * width) / 1440)).toBeLessThanOrEqual(1);

    if (width >= 1440) {
      const frame = await page.locator('[data-layout="home-hero-frame"]').boundingBox();
      const collage = await page.locator('[data-layout="home-collage"]').boundingBox();
      expect(frame).not.toBeNull();
      expect(collage).not.toBeNull();
      expect(Math.abs(frame!.x - (width - 1440) / 2)).toBeLessThanOrEqual(1);
      expect(Math.abs(frame!.width - 1440)).toBeLessThanOrEqual(1);
      expect(Math.abs(collage!.x - ((width - 1440) / 2 + 718))).toBeLessThanOrEqual(4);
      expect(Math.abs(collage!.width - 650)).toBeLessThanOrEqual(4);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({ path: info.outputPath('home-clouds.png'), fullPage: true });
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
        await expect(page.locator('[data-node-id="3:28"]')).toBeVisible();
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
          ['home-hero', 76, 548],
          ['home-features', 624, 442],
          ['home-about', 1066, 432],
          ['home-inspiration', 1498, 390],
          ['home-footer', 1888, 256],
        ] as const;
        for (const [layout, y, height] of targets) {
          const bounds = await page.locator(`[data-layout="${layout}"]`).boundingBox();
          expect(bounds).not.toBeNull();
          expect(Math.abs(bounds!.y - y)).toBeLessThanOrEqual(4);
          expect(Math.abs(bounds!.height - height)).toBeLessThanOrEqual(4);
        }
        for (const [layout, target] of [
          ['home-collage', { x: 718, y: 111, width: 650, height: 470 }],
          ['home-devices', { x: 497, y: 1095, width: 890, height: 398 }],
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
        const form = page.getByRole('form');
        const bounds = await form.boundingBox();
        expect(bounds).not.toBeNull();
        const target =
          route === '/login'
            ? { x: 886, y: 166, width: 440 }
            : route === '/register'
              ? { x: 876, y: 142, width: 458 }
              : { x: 130, y: 220, width: 560 };
        for (const dimension of ['x', 'y', 'width'] as const)
          expect(Math.abs(bounds![dimension] - target[dimension])).toBeLessThanOrEqual(4);
        if (route === '/login') expect(Math.abs(bounds!.height - 580.8)).toBeLessThanOrEqual(4);
        if (route === '/profile') expect(Math.abs(bounds!.height - 620)).toBeLessThanOrEqual(4);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        size.width,
      );
      if (route === '/profile' && size.width <= 768) {
        await expect(page.getByLabel('Tên hiển thị')).toBeVisible();
      }
      await page.locator('main > details[data-preview="shell"] summary').scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
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
  await expect(page.getByLabel('Họ và tên')).toBeFocused();
  await page.getByLabel('Họ và tên').fill('Người xem trước');
  await page.getByLabel('Email', { exact: true }).fill('preview@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('a long preview password');
  await page.getByLabel('Nhập lại mật khẩu').fill('a long preview password');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page.getByText(/Identity chưa kết nối/)).toBeVisible();
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
  await expect(page.getByText(/Chưa thể lưu thay đổi lúc này/)).toBeVisible();
  await expect(page.getByText(/Phiên bản hồ sơ: 1/)).toBeVisible();
  await page.getByText('Phiên đăng nhập', { exact: true }).click();
  await expect(page.getByText('Phiên đăng nhập 1')).toBeVisible();
});
