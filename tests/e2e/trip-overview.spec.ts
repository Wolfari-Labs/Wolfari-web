import { test, expect, type Locator, type Page } from '@playwright/test';

const trip = '/trips/11111111-1111-4111-8111-111111111111';

/**
 * The overview owns the scrollable desktop main. Keeping the viewport matrix
 * here makes the width contract explicit without turning every case into a
 * screenshot baseline.
 */
const viewports = [
  { width: 2560, height: 960 },
  { width: 1920, height: 960 },
  { width: 1440, height: 960 },
  { width: 1440, height: 800 },
  { width: 1366, height: 600 },
  { width: 1366, height: 520 },
  { width: 1200, height: 800 },
  { width: 1101, height: 800 },
  { width: 1100, height: 800 },
  { width: 1024, height: 768 },
  { width: 820, height: 768 },
  { width: 768, height: 1024 },
  { width: 402, height: 874 },
  { width: 320, height: 600 },
] as const;

const workspace = (page: Page) => page.locator('[data-region="trip-overview-workspace"]');
const itinerary = (page: Page) => page.locator('[data-region="trip-overview-itinerary"]');

async function openOverview(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto(trip);
  await expect(page.getByRole('heading', { name: 'Đà Nẵng – Hội An', exact: true })).toBeVisible();
  await expect(workspace(page)).toBeVisible();
}

async function assertNoHorizontalOverflow(page: Page, width: number) {
  const dimensions = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(dimensions.viewport).toBe(width);
  expect(dimensions.document).toBeLessThanOrEqual(width);
  expect(dimensions.body).toBeLessThanOrEqual(width);
}

async function assertDesktopContentEdges(page: Page, width: number) {
  const hero = (await page.getByRole('region', { name: 'Thông tin chuyến đi' }).boundingBox())!;
  const summary = (await page.locator('[data-region="trip-overview-summaries"]').boundingBox())!;
  const board = (await workspace(page).boundingBox())!;
  const expectedLeft = 220 + 18;
  const expectedRight = width - 22;
  expectNear(hero.x, expectedLeft, `${width}px hero left edge`);
  expectNear(rightEdge(hero), expectedRight, `${width}px hero right edge`);
  expectNear(summary.x, expectedLeft, `${width}px summary left edge`);
  expectNear(rightEdge(summary), expectedRight, `${width}px summary right edge`);
  expectNear(board.x, expectedLeft, `${width}px workspace left edge`);
  expectNear(rightEdge(board), expectedRight, `${width}px workspace right edge`);
}

async function assertNoNestedVerticalScroll(locator: Locator) {
  const metrics = await locator.evaluate((element) => ({
    overflowY: getComputedStyle(element).overflowY,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));
  expect(metrics.overflowY).not.toBe('auto');
  expect(metrics.overflowY).not.toBe('scroll');
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
}

function rightEdge(box: { x: number; width: number }) {
  return box.x + box.width;
}

function expectNear(actual: number, expected: number, label: string) {
  expect(Math.abs(actual - expected), label).toBeLessThanOrEqual(4);
}

for (const viewport of viewports) {
  test(`Trip overview reaches the final content at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    const apiRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
    });

    await openOverview(page, viewport);
    await assertNoHorizontalOverflow(page, viewport.width);
    if (viewport.width > 768) await assertDesktopContentEdges(page, viewport.width);

    const finalLink = itinerary(page).getByRole('link', { name: /Xem chi tiết lịch trình/ });
    await finalLink.scrollIntoViewIfNeeded();
    await expect(finalLink).toBeVisible();

    // Desktop content scrolls in <main>; the document itself remains fixed.
    if (viewport.width > 768) {
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
        viewport.height,
      );
      expect(await page.evaluate(() => scrollY)).toBe(0);
    }

    await assertNoNestedVerticalScroll(workspace(page));
    await assertNoNestedVerticalScroll(itinerary(page));
    expect(apiRequests).toEqual([]);
  });
}

test('Trip overview uses all available desktop width with the expanded and collapsed sidebar', async ({
  page,
}, testInfo) => {
  await openOverview(page, { width: 1440, height: 960 });

  const sidebar = page.getByRole('complementary');
  const collapse = page.getByRole('button', { name: 'Thu gọn thanh điều hướng' });

  for (const state of ['expanded', 'collapsed'] as const) {
    if (state === 'collapsed') {
      await collapse.click();
      await expect(page.getByRole('button', { name: 'Mở rộng thanh điều hướng' })).toBeVisible();
    }

    const sidebarBox = (await sidebar.boundingBox())!;
    const heroBox = (await page
      .getByRole('region', { name: 'Thông tin chuyến đi' })
      .boundingBox())!;
    const summaryBox = (await page
      .locator('[data-region="trip-overview-summaries"]')
      .boundingBox())!;
    const workspaceBox = (await workspace(page).boundingBox())!;
    const expectedLeft = Math.round(sidebarBox.width) + 18;
    const expectedRight = 1440 - 22;

    expectNear(heroBox.x, expectedLeft, `${state} hero left edge`);
    expectNear(rightEdge(heroBox), expectedRight, `${state} hero right edge`);
    expectNear(summaryBox.x, expectedLeft, `${state} summary left edge`);
    expectNear(rightEdge(summaryBox), expectedRight, `${state} summary right edge`);
    expectNear(workspaceBox.x, expectedLeft, `${state} workspace left edge`);
    expectNear(rightEdge(workspaceBox), expectedRight, `${state} workspace right edge`);
    expectNear(heroBox.height, 170, `${state} hero height`);
    expect(workspaceBox.height).toBeGreaterThanOrEqual(408);

    const columns = await workspace(page)
      .locator(':scope > *')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { width: box.width, height: box.height };
        }),
      );
    expect(columns).toHaveLength(3);
    expect(columns[0]!.height).toBeGreaterThanOrEqual(408);
    expect(columns[1]!.height).toBeGreaterThanOrEqual(408);
    expect(columns[2]!.height).toBeGreaterThanOrEqual(408);
    const usableWidth = workspaceBox.width - 28;
    const expectedColumnWidths = [578, 314, 260].map((value) => (usableWidth * value) / 1152);
    columns.forEach((column, index) =>
      expectNear(column.width, expectedColumnWidths[index]!, `${state} workspace column ${index}`),
    );

    const fareBox = (await page.locator('[data-region="trip-overview-fare"]').boundingBox())!;
    const postcardBox = (await page
      .locator('[data-region="trip-overview-postcard"]')
      .boundingBox())!;
    expect(fareBox.height).toBeGreaterThanOrEqual(190);
    expect(postcardBox.height).toBeGreaterThanOrEqual(204);
    await assertNoNestedVerticalScroll(workspace(page));
    await assertNoNestedVerticalScroll(itinerary(page));

    if (state === 'expanded') {
      expect(Math.round(sidebarBox.width)).toBe(220);
      await page.screenshot({ path: testInfo.outputPath('overview-expanded.png'), fullPage: true });
    } else {
      expect(Math.round(sidebarBox.width)).toBe(72);
      await page.screenshot({
        path: testInfo.outputPath('overview-collapsed.png'),
        fullPage: true,
      });
    }
  }
});

test('Trip overview workspace grows for a long fifth activity and keeps its end reachable', async ({
  page,
}) => {
  await openOverview(page, { width: 1440, height: 960 });
  const panel = itinerary(page);
  const board = workspace(page);
  const rows = panel.locator('ol > li');
  await expect(rows).toHaveCount(4);
  const before = (await board.boundingBox())!.height;

  await panel.locator('ol').evaluate((list) => {
    const row = document.createElement('li');
    const time = document.createElement('time');
    time.textContent = '21:00';
    const title = document.createElement('span');
    title.textContent = Array.from(
      { length: 4 },
      () =>
        'Hoạt động bổ sung có tên rất dài để kiểm tra việc xuống dòng, tăng chiều cao workspace và giữ toàn bộ nội dung có thể truy cập trên màn hình desktop.',
    ).join(' ');
    row.append(time, title);
    list.append(row);
  });

  await expect.poll(async () => (await board.boundingBox())!.height).toBeGreaterThan(before + 20);
  await expect(rows).toHaveCount(5);
  const lastRow = rows.last();
  await lastRow.scrollIntoViewIfNeeded();
  await expect(lastRow).toBeVisible();
  const finalLink = panel.getByRole('link', { name: /Xem chi tiết lịch trình/ });
  await finalLink.scrollIntoViewIfNeeded();
  await expect(finalLink).toBeVisible();
  await assertNoNestedVerticalScroll(board);
  await assertNoNestedVerticalScroll(panel);
  await assertNoHorizontalOverflow(page, 1440);
});

test('Trip overview keeps navigation, metadata states and scroll boundaries stable', async ({
  page,
}) => {
  await openOverview(page, { width: 1440, height: 960 });
  const preview = page.locator('[data-preview="trip-detail"]');
  if (!(await preview.evaluate((element) => (element as HTMLDetailsElement).open)))
    await preview.locator(':scope > summary').click();
  await page.getByText('Thông tin và phiên bản', { exact: true }).click();
  await expect(page.getByText('1 / 1 / 1', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: '4 thành viên', exact: true }).click();
  await expect(page).toHaveURL(trip + '/members');
  await page.goBack();
  await expect(
    page.getByRole('heading', { name: 'Tổng quan chuyến đi', exact: true }),
  ).toBeVisible();

  if (!(await preview.evaluate((element) => (element as HTMLDetailsElement).open)))
    await preview.locator(':scope > summary').click();
  for (const [scenario, text] of [
    ['error', 'Chưa thể tải nội dung'],
    ['forbidden', 'Bạn không có quyền truy cập'],
    ['not-found', 'Không tìm thấy nội dung'],
    ['conflict', 'Dữ liệu đã thay đổi'],
    ['unavailable', 'Chức năng chưa khả dụng'],
    ['empty', 'Chưa có nội dung'],
    ['loading', 'Đang tải…'],
  ] as const) {
    await page.getByLabel('Trạng thái tổng quan').selectOption(scenario);
    await expect(page.getByRole('heading', { name: text, exact: true })).toBeVisible();
  }
});
