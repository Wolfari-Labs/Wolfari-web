import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { assertOverviewCardLayout } from '../overview-layout-check';

test.use({ baseURL: process.env.PLAYWRIGHT_OVERVIEW_URL ?? 'http://127.0.0.1:5173' });
const trip = '/trips/11111111-1111-4111-8111-111111111111';
const viewports = [
  [2560, 960],
  [1920, 960],
  [1440, 960],
  [1440, 800],
  [1366, 768],
  [1366, 600],
  [1366, 520],
  [1200, 800],
  [1101, 800],
  [1100, 800],
  [1024, 768],
  [820, 768],
  [768, 1024],
  [402, 874],
  [320, 600],
] as const;
const workspace = (page: Page) => page.locator('[data-region="trip-overview-workspace"]');
const itinerary = (page: Page) => page.locator('[data-region="trip-overview-itinerary"]');

async function openOverview(page: Page, width = 1440, height = 960) {
  await page.setViewportSize({ width, height });
  await page.goto(trip);
  await expect(page.getByRole('heading', { name: 'Đà Nẵng – Hội An', exact: true })).toBeVisible();
  await expect(itinerary(page).locator('ol > li')).toHaveCount(4);
  await page.evaluate(() => document.fonts.ready);
}
async function assertViewportBounded(page: Page) {
  const m = await page.evaluate(() => {
    const main = document.querySelector('main')!;
    const overview = document.querySelector('[data-flow="trip-overview"]')!;
    return {
      dw: document.documentElement.scrollWidth,
      dh: document.documentElement.scrollHeight,
      w: innerWidth,
      h: innerHeight,
      overflow: main.scrollHeight - main.clientHeight,
      horizontal: main.scrollWidth - main.clientWidth,
      bottom: overview.getBoundingClientRect().bottom,
    };
  });
  expect(m.dw).toBeLessThanOrEqual(m.w);
  expect(m.dh).toBeLessThanOrEqual(m.h);
  expect(m.overflow).toBeLessThanOrEqual(1);
  expect(m.horizontal).toBeLessThanOrEqual(1);
  expect(m.bottom).toBeLessThanOrEqual(m.h + 1);
}
for (const [width, height] of viewports) {
  test(
    'Trip overview stays within one browser viewport at ' + width + 'x' + height,
    async ({ page }, info) => {
      const apiRequests: string[] = [];
      page.on('request', (r) => {
        if (new URL(r.url()).pathname.startsWith('/api/')) apiRequests.push(r.url());
      });
      await openOverview(page, width, height);
      await assertViewportBounded(page);
      await assertOverviewCardLayout(page);
      for (const region of ['fund', 'packing']) {
        const panel = page.locator(`[data-region="trip-overview-${region}"]`);
        const bar = panel.locator('[role="progressbar"], [role="img"]');
        const cardBox = (await panel.boundingBox())!,
          barBox = (await bar.boundingBox())!;
        expect(cardBox.y + cardBox.height - barBox.y - barBox.height).toBeGreaterThanOrEqual(20);
        expect(cardBox.y + cardBox.height - barBox.y - barBox.height).toBeLessThanOrEqual(25);
        const copy = (await panel.locator('p').last().boundingBox())!;
        expect(barBox.y - copy.y - copy.height).toBeGreaterThanOrEqual(12);
      }
      const link = itinerary(page).getByRole('link', { name: /Xem chi tiết lịch trình/ });
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();
      const postcard = page.locator('[data-region="trip-overview-postcard"]');
      await postcard.scrollIntoViewIfNeeded();
      await expect(postcard).toBeVisible();
      await assertViewportBounded(page);
      expect(apiRequests).toEqual([]);
      await page.screenshot({ path: info.outputPath('overview-' + width + 'x' + height + '.png') });
    },
  );
}
test('Trip overview matches refreshed Figma columns and keeps the shell and schedule cover', async ({
  page,
}, info) => {
  await openOverview(page);
  for (const state of ['expanded', 'collapsed'] as const) {
    if (state === 'collapsed')
      await page.getByRole('button', { name: 'Thu gọn thanh điều hướng' }).click();
    await expect(page.getByRole('complementary')).toHaveCSS(
      'width',
      state === 'expanded' ? '220px' : '72px',
    );
    const left = (state === 'expanded' ? 220 : 72) + 18;
    for (const region of ['trip-hero', 'trip-overview-summaries', 'trip-overview-workspace']) {
      const box = (await page.locator('[data-region="' + region + '"]').boundingBox())!;
      expect(Math.abs(box.x - left)).toBeLessThanOrEqual(1);
      expect(Math.abs(box.x + box.width - 1418)).toBeLessThanOrEqual(1);
    }
    await expect(page.locator('[data-region="trip-hero"]')).toHaveAttribute(
      'data-variant',
      'landscape',
    );
    expect((await page.locator('[data-region="trip-hero"]').boundingBox())!.height).toBe(150);
    const board = (await workspace(page).boundingBox())!;
    expect(board.height).toBe(401);
    const columns = await workspace(page)
      .locator(':scope > *')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    expect(columns).toHaveLength(3);
    await assertOverviewCardLayout(page);
    const summaryColumns = await page
      .locator('[data-region="trip-overview-summaries"] > section')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    expect(Math.abs(columns[0]! - summaryColumns[0]! - summaryColumns[1]! - 13)).toBeLessThan(1);
    const assets = await page.locator('[data-flow="trip-overview"] img').evaluateAll((els) =>
      els.map((el) => {
        const image = el as HTMLImageElement;
        return {
          src: image.getAttribute('src'),
          loaded: image.complete && image.naturalWidth > 0,
          width: image.getBoundingClientRect().width,
          height: image.getBoundingClientRect().height,
        };
      }),
    );
    expect(assets.every((a) => a.loaded && a.width > 0 && a.height > 0)).toBe(true);
    expect(assets.some((a) => a.src?.includes('figma.com'))).toBe(false);
    await assertViewportBounded(page);
    await page.screenshot({ path: info.outputPath('overview-' + state + '.png') });
  }
});
test('Long itinerary scrolls internally without extending the overview or losing the final action', async ({
  page,
}) => {
  await openOverview(page);
  const panel = itinerary(page),
    before = (await workspace(page).boundingBox())!.height;
  await panel.locator('ol').evaluate((list) => {
    const row = document.createElement('li'),
      time = document.createElement('time'),
      title = document.createElement('span');
    time.textContent = '21:00';
    title.textContent =
      'Hoạt động có tên rất dài để kiểm tra xuống dòng và cuộn trong danh sách. '.repeat(20);
    row.append(time, title);
    list.append(row);
  });
  expect((await workspace(page).boundingBox())!.height).toBe(before);
  await panel.locator('ol > li').last().scrollIntoViewIfNeeded();
  await expect(panel.locator('ol > li').last()).toBeVisible();
  await expect(panel.getByRole('link', { name: /Xem chi tiết lịch trình/ })).toBeVisible();
  const list = panel.locator('ol');
  expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await list.focus();
  await page.keyboard.press('End');
  await assertViewportBounded(page);
});
test('Selected day updates the KPI and preserves real navigation and honest unavailable data', async ({
  page,
}) => {
  await openOverview(page);
  const summary = page.locator('[data-region="trip-overview-summaries"]');
  await expect(summary.getByText('4 hoạt động', { exact: true })).toBeVisible();
  await itinerary(page)
    .getByRole('button', { name: /Ngày 4/ })
    .click();
  await expect(summary.getByText('0 hoạt động', { exact: true })).toBeVisible();
  await expect(itinerary(page).getByText('Chưa có hoạt động trong ngày này.')).toBeVisible();
  await expect(summary.getByText('Chưa có dữ liệu thời tiết')).toBeVisible();
  await expect(
    page.locator('[data-region="trip-overview-map"]').getByText('Minh họa', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: '4 thành viên', exact: true }).click();
  await expect(page).toHaveURL(trip + '/members');
});
test('Trip overview keeps metadata and error scenarios reachable', async ({ page }) => {
  await openOverview(page);
  await page.locator('[data-preview="trip-detail"] > summary').click();
  await page.getByText('Thông tin và phiên bản', { exact: true }).click();
  await expect(page.getByText('1 / 1 / 1', { exact: true })).toBeVisible();
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
test('Trip feature pages share the exact schedule banner and real trip identity', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  let schedule: unknown;
  for (const route of [
    'plan',
    '',
    'map',
    'dress-code',
    'packing',
    'members',
    'fund',
    'price-watch',
    'settings',
  ]) {
    await page.goto(trip + (route ? '/' + route : ''));
    const hero = page.locator('[data-region="trip-hero"]');
    await expect(hero).toBeVisible();
    await expect(
      hero.getByRole('heading', { name: 'Đà Nẵng – Hội An', exact: true }),
    ).toBeVisible();
    await expect(hero.getByRole('button', { name: 'Chia sẻ' })).toBeDisabled();
    await expect(hero.getByRole('link', { name: 'Chỉnh sửa' })).toHaveAttribute(
      'href',
      trip + '/settings',
    );
    const signature = await hero.evaluate((el) => {
      const s = getComputedStyle(el),
        h = getComputedStyle(el.querySelector('h2')!);
      return {
        background: s.backgroundImage,
        height: el.getBoundingClientRect().height,
        radius: s.borderRadius,
        titleSize: h.fontSize,
        text: el.textContent,
      };
    });
    if (route === 'plan') schedule = signature;
    else expect(signature).toEqual(schedule);
  }
});
test('Refreshed overview has no scoped accessibility violations', async ({ page }, info) => {
  await openOverview(page);
  const results = await new AxeBuilder({ page }).include('[data-flow="trip-overview"]').analyze();
  await info.attach('overview-axe', {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  });
  expect(results.violations).toEqual([]);
});

for (const [region, name, route] of [
  ['day', 'Lịch trình trong ngày', 'plan'],
  ['fund', 'Ngân sách / Quỹ nhóm', 'fund'],
  ['packing', 'Tiến độ Packing list', 'packing'],
  ['itinerary', 'Lịch trình', 'plan'],
  ['map', 'Xem bản đồ địa điểm', 'map'],
  ['fare', 'Theo dõi giá vé', 'price-watch'],
] as const) {
  test(`Overview ${region} card supports full-surface and keyboard navigation`, async ({
    page,
  }) => {
    await openOverview(page);
    const card = page.locator(`[data-region="trip-overview-${region}"]`);
    const link = card.getByRole('link', { name, exact: true });
    await expect(link).toHaveAttribute('href', `${trip}/${route}`);
    // Click the card padding, not a text link.
    await card.click({ position: { x: 5, y: 5 } });
    await expect(page).toHaveURL(`${trip}/${route}`);
    await openOverview(page);
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`${trip}/${route}`);
  });
}

test('Card links keep middle-click semantics and accessible colors with compact fare and map content', async ({
  page,
}) => {
  await openOverview(page);
  const popupPromise = page.context().waitForEvent('page');
  await page
    .locator('[data-region="trip-overview-fund"]')
    .click({ button: 'middle', position: { x: 8, y: 8 } });
  const popup = await popupPromise;
  await expect(popup).toHaveURL(`${trip}/fund`);
  await popup.close();
  await expect(page).toHaveURL(trip);
  const fare = page.locator('[data-region="trip-overview-fare"]');
  await expect(fare.locator('p')).toHaveText(['—', 'Chưa có dữ liệu']);
  const map = page.locator('[data-region="trip-overview-map"]');
  await expect(map.getByRole('link')).toHaveCount(1);
  await expect(map.getByText(/Xem chi tiết/)).toHaveCount(0);
  await expect(itinerary(page).locator('button[aria-pressed="true"]')).toHaveCSS(
    'background-color',
    'rgb(0, 127, 153)',
  );
  await expect(itinerary(page).locator('time').first()).toHaveCSS('color', 'rgb(0, 121, 159)');
  await expect(map.getByRole('link')).toHaveCSS('color', 'rgb(0, 121, 159)');
  const progress = page.locator('[data-region="trip-overview-packing"]').getByRole('progressbar');
  await expect(progress).toBeVisible();
  await expect(progress).toHaveCSS('height', '12px');
  await expect(progress).toHaveCSS('background-color', 'rgb(231, 235, 238)');
  await expect(progress.locator('span')).toHaveCSS('background-color', 'rgb(58, 205, 98)');
  await itinerary(page).locator('li').first().click();
  await expect(page).toHaveURL(`${trip}/plan`);
});
