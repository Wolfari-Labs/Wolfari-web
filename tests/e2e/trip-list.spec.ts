import { expect, test, type Page } from '@playwright/test';

const trips = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Đà Nẵng – Hội An' },
  { id: '33333333-3333-4333-8333-333333333333', name: 'Phú Quốc – Hẹn với biển' },
  { id: '44444444-4444-4444-8444-444444444444', name: 'Đà Lạt – Một chút bình yên' },
  { id: '55555555-5555-4555-8555-555555555555', name: 'Sài Gòn – Vũng Tàu' },
  { id: '66666666-6666-4666-8666-666666666666', name: 'Huế – Chậm một nhịp' },
  { id: '77777777-7777-4777-8777-777777777777', name: 'Ninh Bình – Giữa núi xanh' },
] as const;
const tripIds = trips.map((trip) => trip.id);
const articles = (page: Page) => page.locator('article[data-trip-id]');
const filters = (page: Page) => page.getByRole('group', { name: 'Trạng thái chuyến đi' });

async function ready(page: Page) {
  await expect(page.getByRole('heading', { level: 1, name: 'Chuyến đi của tôi' })).toBeVisible();
  await expect(articles(page)).toHaveCount(6);
}

async function expectIds(page: Page, ids: readonly string[]) {
  await expect
    .poll(() =>
      articles(page).evaluateAll((elements) =>
        elements.map((item) => item.getAttribute('data-trip-id')),
      ),
    )
    .toEqual(ids);
}

async function choosePreview(page: Page, preview: 'shell' | 'trip-list', scenario: string) {
  const controls = page.locator(`details[data-preview="${preview}"]`);
  if (!(await controls.evaluate((element) => (element as HTMLDetailsElement).open)))
    await controls.locator('summary').click();
  await controls
    .getByLabel(preview === 'shell' ? 'Trạng thái preview' : 'Trạng thái danh sách')
    .selectOption(scenario);
}

async function openSearch(page: Page) {
  const disclosure = page.getByRole('button', { name: 'Tìm kiếm và sắp xếp' });
  if ((await disclosure.isVisible()) && (await disclosure.getAttribute('aria-expanded')) !== 'true')
    await disclosure.click();
}

async function loadedImages(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() =>
      page.locator('img:visible').evaluateAll((elements) =>
        elements.every((element) => {
          const image = element as HTMLImageElement;
          return image.complete && image.naturalWidth > 0;
        }),
      ),
    )
    .toBe(true);
  const images = await page.locator('img:visible').evaluateAll((elements) =>
    elements.map((element) => {
      const image = element as HTMLImageElement;
      const bounds = image.getBoundingClientRect();
      return { source: image.currentSrc || image.src, width: bounds.width, height: bounds.height };
    }),
  );
  expect(images.length).toBeGreaterThan(0);
  for (const image of images) {
    expect(image.source).not.toContain('figma.com');
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
  }
}

async function expectNoTransport(page: Page, apiCalls: readonly string[]) {
  expect(apiCalls).toEqual([]);
  expect(
    await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
  ).toEqual({ local: 0, session: 0 });
}

function watchApi(page: Page) {
  const calls: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) calls.push(request.url());
  });
  return calls;
}

for (const viewport of [
  { width: 1440, height: 800 },
  { width: 1366, height: 520 },
  { width: 820, height: 900 },
  { width: 768, height: 900 },
  { width: 402, height: 874 },
  { width: 320, height: 600 },
]) {
  test(`Trip List layout ${viewport.width}×${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    const apiCalls = watchApi(page);
    await page.goto('/trips');
    await ready(page);
    await expectIds(page, tripIds);
    await expect(page.locator('[data-trip-id="88888888-8888-4888-8888-888888888888"]')).toHaveCount(
      0,
    );
    await expect(page.locator('[data-trip-id="22222222-2222-4222-8222-222222222222"]')).toHaveCount(
      0,
    );
    await expect(page.getByText('Chuyến đi riêng tư – không được hiển thị')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await loadedImages(page);
    await expect(page.getByRole('complementary')).toHaveCount(0);
    await expect(filters(page).getByRole('button')).toHaveCount(5);
    await expect(
      filters(page).getByRole('button', { name: 'Tất cả · 6', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    const header = page.locator(
      'header[data-node-id="135:483"]:visible, header[data-node-id="779:6442"]:visible',
    );
    await expect(header).toHaveCount(1);
    const desktop = viewport.width > 768;
    expect(Math.round((await header.boundingBox())!.height)).toBe(desktop ? 76 : 72);
    const targets = await page
      .locator(
        'button:visible:not(:disabled), a:visible, input:visible, select:visible, summary:visible',
      )
      .evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return {
            name: element.getAttribute('aria-label') || element.textContent || element.tagName,
            width: box.width,
            height: box.height,
          };
        }),
      );
    for (const target of targets) {
      expect(target.width, target.name).toBeGreaterThanOrEqual(44);
      expect(target.height, target.name).toBeGreaterThanOrEqual(44);
    }
    const boxes = await articles(page).evaluateAll((elements) =>
      elements.map((item) => {
        const box = item.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width };
      }),
    );
    if (viewport.width === 1440) {
      for (const [key, expected] of Object.entries({ x: 64, y: 372, width: 416 }))
        expect(
          Math.abs(boxes[0]![key as keyof (typeof boxes)[number]] - expected),
          `Figma first trip card ${key}`,
        ).toBeLessThanOrEqual(4);
    }
    if (desktop) {
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
        true,
      );
      expect(
        await page.locator('main').evaluate((element) => getComputedStyle(element).overflowY),
      ).toBe('auto');
      const columns = viewport.width > 1000 ? 3 : 2;
      for (let index = 1; index < columns; index++) {
        expect(boxes[index]!.y).toBeCloseTo(boxes[0]!.y, 0);
        expect(boxes[index]!.x).toBeGreaterThan(boxes[index - 1]!.x);
      }
      expect(boxes[columns]!.y).toBeGreaterThan(boxes[0]!.y);
      if (viewport.height === 520)
        expect(
          Math.round((await page.locator('header[data-node-id="65:548"]').boundingBox())!.height),
        ).toBe(174);
      await page.screenshot({ path: info.outputPath('trip-list.png') });
      await articles(page).last().scrollIntoViewIfNeeded();
      await expect(articles(page).last()).toBeInViewport();
      await page.locator('details[data-preview="shell"] summary').scrollIntoViewIfNeeded();
      await expect(page.locator('details[data-preview="shell"] summary')).toBeInViewport();
      expect(await page.locator('main').evaluate((element) => element.scrollTop)).toBeGreaterThan(
        0,
      );
      expect(await page.evaluate(() => scrollY)).toBe(0);
      expect(Math.round((await header.boundingBox())!.y)).toBe(0);
    } else {
      const logo = (await header.locator('img[alt="Wolfari"]').boundingBox())!;
      expect(Math.round(logo.x)).toBe(16);
      const menu = header.getByRole('button', { name: 'Mở điều hướng chính' });
      const account = header.getByRole('link', { name: /Hồ sơ cá nhân/ });
      expect((await account.boundingBox())!.x).toBeGreaterThan(logo.x + logo.width);
      expect((await menu.boundingBox())!.x).toBeGreaterThan(
        (await account.boundingBox())!.x + (await account.boundingBox())!.width,
      );
      await expect(header.getByRole('heading')).toHaveCount(0);
      expect(
        (await page.locator('main').getByRole('heading', { level: 1 }).boundingBox())!.y,
      ).toBeGreaterThanOrEqual((await header.boundingBox())!.height);
      await expect(
        page.getByRole('navigation', { name: 'Điều hướng Mobile', exact: true }),
      ).toHaveCount(0);
      for (let index = 1; index < boxes.length; index++)
        expect(boxes[index]!.y).toBeGreaterThan(boxes[index - 1]!.y);
      const statusGroup = filters(page);
      expect(await statusGroup.evaluate((element) => getComputedStyle(element).overflowX)).toBe(
        'auto',
      );
      await statusGroup
        .getByRole('button', { name: 'Đã lưu trữ · 0 (Lưu trữ)', exact: true })
        .scrollIntoViewIfNeeded();
      await expect(
        statusGroup.getByRole('button', { name: 'Đã lưu trữ · 0 (Lưu trữ)', exact: true }),
      ).toBeInViewport();
      await statusGroup.evaluate((element) => {
        element.scrollLeft = 0;
      });
      await page.screenshot({ path: info.outputPath('trip-list.png'), fullPage: true });
      await articles(page).last().scrollIntoViewIfNeeded();
      await expect(articles(page).last()).toBeInViewport();
      expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
      expect(await page.locator('main').evaluate((element) => element.scrollTop)).toBe(0);
    }
    await expectNoTransport(page, apiCalls);
  });
}

for (const width of [1440, 402]) {
  test(`Trip List local filters search and date sorting ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 874 });
    const apiCalls = watchApi(page);
    await page.goto('/trips');
    await ready(page);
    await openSearch(page);
    const search = page.getByRole('searchbox', { name: 'Tìm chuyến đi theo tên' });
    const sort = page.getByLabel('Sắp xếp chuyến đi');
    await search.fill('dA NANG');
    await expectIds(page, [tripIds[0]!]);
    await search.fill('ĐÀ LẠT');
    await expectIds(page, [tripIds[2]!]);
    await search.fill('');
    for (const [label, ids] of [
      ['Sắp tới · 3', [tripIds[1]!, tripIds[2]!, tripIds[3]!]],
      ['Đang diễn ra · 1 (Đang đi)', [tripIds[0]!]],
      ['Đã kết thúc · 2 (Đã đi)', [tripIds[4]!, tripIds[5]!]],
      ['Đã lưu trữ · 0 (Lưu trữ)', []],
      ['Tất cả · 6', tripIds],
    ] as const) {
      const button = filters(page).getByRole('button', { name: label, exact: true });
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expectIds(page, ids);
    }
    await sort.selectOption('start-asc');
    await expectIds(page, [
      tripIds[5]!,
      tripIds[4]!,
      tripIds[0]!,
      tripIds[1]!,
      tripIds[2]!,
      tripIds[3]!,
    ]);
    await sort.selectOption('start-desc');
    await expectIds(page, [
      tripIds[3]!,
      tripIds[2]!,
      tripIds[1]!,
      tripIds[0]!,
      tripIds[4]!,
      tripIds[5]!,
    ]);
    await sort.selectOption('listed');
    await expectIds(page, tripIds);
    await search.fill('Không có hành trình này');
    await expect(page.getByRole('heading', { name: 'Không có chuyến đi phù hợp' })).toBeVisible();
    await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
    await expect(search).toHaveValue('');
    await expect(sort).toHaveValue('listed');
    await expectIds(page, tripIds);
    await expect(
      filters(page).getByRole('button', { name: 'Tất cả · 6', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    if (width > 768) {
      await expect(page.getByRole('link', { name: 'Tạo chuyến đi', exact: true })).toHaveAttribute(
        'href',
        '/trips/new',
      );
      for (const label of ['Vai trò: Tất cả', 'Thời gian', 'Bộ lọc'])
        await expect(page.getByRole('button', { name: label, exact: true })).toBeDisabled();
      for (const action of await articles(page).getByRole('button').all())
        await expect(action).toBeEnabled();
    } else
      await expect(page.getByRole('link', { name: 'Tạo chuyến đi', exact: true })).toHaveAttribute(
        'href',
        '/trips/new',
      );
    await expectNoTransport(page, apiCalls);
  });

  test(`Trip List read states preserve filters and Guest cannot read ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 874 });
    const apiCalls = watchApi(page);
    await page.goto('/trips');
    await ready(page);
    await openSearch(page);
    const search = page.getByRole('searchbox', { name: 'Tìm chuyến đi theo tên' });
    const sort = page.getByLabel('Sắp xếp chuyến đi');
    await search.fill('Đà');
    await sort.selectOption('start-desc');
    await filters(page).getByRole('button', { name: 'Sắp tới · 3', exact: true }).click();
    await expectIds(page, [tripIds[2]!]);
    for (const [scenario, message] of [
      ['empty', 'Chưa có chuyến đi'],
      ['error', 'Chưa thể tải nội dung'],
      ['forbidden', 'Bạn không có quyền truy cập'],
      ['conflict', 'Dữ liệu đã thay đổi'],
      ['unavailable', 'Chức năng chưa khả dụng'],
      ['loading', 'Đang tải…'],
    ]) {
      await choosePreview(page, 'trip-list', scenario!);
      await expect(
        page.getByRole('heading', { level: 2, name: message!, exact: true }),
      ).toBeVisible();
      await expect(articles(page)).toHaveCount(0);
      await expect(search).toHaveValue('Đà');
      await expect(sort).toHaveValue('start-desc');
      await expect(filters(page).getByRole('button', { name: /^Sắp tới/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      if (scenario === 'loading') await expect(page.locator('[aria-busy="true"]')).toBeVisible();
      if (scenario === 'error' || scenario === 'conflict') {
        await page.getByRole('button', { name: 'Tải lại', exact: true }).click();
        await expect(
          page.getByRole('heading', { level: 2, name: message!, exact: true }),
        ).toBeVisible();
      }
      await choosePreview(page, 'trip-list', 'success');
      await expectIds(page, [tripIds[2]!]);
    }
    await choosePreview(page, 'shell', 'guest');
    await expect(page.getByText('Bạn không có quyền truy cập', { exact: true })).toBeVisible();
    await expect(articles(page)).toHaveCount(0);
    for (const trip of trips)
      await expect(page.getByRole('heading', { name: trip.name, exact: true })).toHaveCount(0);
    await expect(page.locator('details[data-preview="trip-list"]')).toHaveCount(0);
    await choosePreview(page, 'shell', 'success');
    await ready(page);
    await expectNoTransport(page, apiCalls);
  });
}

test('Trip List preserves filter search and sort across viewport changes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/trips');
  await ready(page);
  await page.getByRole('searchbox', { name: 'Tìm chuyến đi theo tên' }).fill('Đà');
  await page.getByLabel('Sắp xếp chuyến đi').selectOption('start-desc');
  await filters(page).getByRole('button', { name: 'Sắp tới · 3', exact: true }).click();
  await expectIds(page, [tripIds[2]!]);
  for (const width of [402, 820, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await openSearch(page);
    await expect(page.getByRole('searchbox', { name: 'Tìm chuyến đi theo tên' })).toHaveValue('Đà');
    await expect(page.getByLabel('Sắp xếp chuyến đi')).toHaveValue('start-desc');
    await expect(
      filters(page).getByRole('button', { name: 'Sắp tới · 3', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expectIds(page, [tripIds[2]!]);
  }
});

test('Trip List keyboard links open six Overview routes and Back returns to list', async ({
  page,
}) => {
  const apiCalls = watchApi(page);
  await page.goto('/trips');
  await ready(page);
  for (const trip of trips) {
    const link = page.getByRole('link', { name: `Mở chuyến đi ${trip.name}`, exact: true });
    await expect(link).toHaveAttribute('href', `/trips/${trip.id}`);
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`/trips/${trip.id}`);
    await expect(page.locator('[data-flow="trip-overview"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: trip.name, exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Tổng quan chuyến đi' }),
    ).toBeVisible();
    await expect(page.locator('main')).toBeFocused();
    await page.goBack();
    await expect(page).toHaveURL('/trips');
    await ready(page);
    await expect(page.locator('main')).toBeFocused();
  }
  await expectNoTransport(page, apiCalls);
});

test('Trip List Mobile drawer keyboard backdrop and same-route navigation restore focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 600 });
  await page.goto('/trips');
  await ready(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Đến nội dung chính' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const menu = page.getByRole('button', { name: 'Mở điều hướng chính' });
  const drawer = page.getByRole('dialog', { name: 'Điều hướng chính' });
  await menu.click();
  await expect(drawer).toBeVisible();
  const box = (await drawer.boundingBox())!;
  expect(box.x).toBe(0);
  expect(Math.round(box.width)).toBe(Math.round(Math.min(300, 402 * 0.86)));
  await expect(drawer.getByRole('button', { name: 'Đóng điều hướng chính' })).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(
        () => !!document.activeElement?.closest('[role="dialog"][data-state="open"]'),
      ),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(menu).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
  await menu.click();
  await page.mouse.click(390, 200);
  await expect(drawer).not.toBeVisible();
  await expect(menu).toBeFocused();
  await menu.click();
  await drawer.getByRole('link', { name: 'Chuyến đi của tôi', exact: true }).click();
  await expect(page).toHaveURL('/trips');
  await expect(drawer).not.toBeVisible();
  await expect(page.locator('main')).toBeFocused();
  await expect(
    page.getByRole('navigation', { name: 'Điều hướng Mobile', exact: true }),
  ).toHaveCount(0);
});

test('Trip List route aliases preserve layout and authenticated permission policy', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  const apiCalls = watchApi(page);
  for (const alias of ['/trips/', '/TRIPS']) {
    const url = `${alias}?source=route-alias`;
    await page.goto(url);
    await ready(page);
    await expect(page).toHaveURL(url);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expectIds(page, tripIds);
    await expect(page.getByRole('complementary')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
      true,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      Math.round(
        (await page.locator('header[data-node-id="135:483"]:visible').boundingBox())!.height,
      ),
    ).toBe(76);
    expect(
      await page.locator('main').evaluate((element) => getComputedStyle(element).overflowY),
    ).toBe('auto');
    await choosePreview(page, 'shell', 'guest');
    await expect(page.getByText('Bạn không có quyền truy cập', { exact: true })).toBeVisible();
    await expect(articles(page)).toHaveCount(0);
    await expect(page.locator('details[data-preview="trip-list"]')).toHaveCount(0);
    await expect(page).toHaveURL(url);
    await choosePreview(page, 'shell', 'success');
    await ready(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expectIds(page, tripIds);
    await expect(page.getByRole('complementary')).toHaveCount(0);
    await expect(page).toHaveURL(url);
  }
  await expectNoTransport(page, apiCalls);
});
