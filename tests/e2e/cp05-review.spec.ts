import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const tripId = '11111111-1111-4111-8111-111111111111';
const routes = [
  { key: 'list', path: '/trips', selector: '[aria-label="Danh sách chuyến đi"]' },
  { key: 'create', path: '/trips/new', selector: '[data-flow="create-trip"]' },
  { key: 'overview', path: `/trips/${tripId}`, selector: '[data-flow="trip-overview"]' },
  { key: 'settings', path: `/trips/${tripId}/settings`, selector: '[data-flow="trip-settings"]' },
] as const;

async function waitForRoute(page: Page, key: (typeof routes)[number]['key']) {
  if (key === 'list') await expect(page.locator('article[data-trip-id]')).toHaveCount(6);
  if (key === 'overview')
    await expect(page.getByRole('region', { name: 'Thông tin chuyến đi' })).toBeVisible();
  if (key === 'settings')
    await expect(
      page.getByRole('heading', { name: 'Thông tin chuyến đi', exact: true }),
    ).toBeVisible();
}

async function waitForImages(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  for (const image of await page.locator('img:visible').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate((element) => {
          const node = element as HTMLImageElement;
          return node.complete && node.naturalWidth > 0;
        }),
      )
      .toBe(true);
  }
  await page.evaluate(() => {
    document.querySelector('main')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  });
}

async function noHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(metrics.document).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.body).toBeLessThanOrEqual(metrics.viewport);
}

for (const viewport of [
  { width: 1440, height: 960 },
  { width: 402, height: 874 },
]) {
  test(`CP05 fixture Web visual and axe review ${viewport.width}`, async ({ page }, info) => {
    test.setTimeout(120000);
    await page.setViewportSize(viewport);
    const apiRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
    });
    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.locator(route.selector)).toBeVisible();
      await waitForRoute(page, route.key);
      await waitForImages(page);
      await noHorizontalOverflow(page);
      await page.screenshot({ path: info.outputPath(`${route.key}.png`), fullPage: true });
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      await writeFile(
        info.outputPath(`axe-${route.key}.json`),
        JSON.stringify(
          scan.violations.map(({ id, impact, nodes }) => ({
            id,
            impact,
            nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
          })),
          null,
          2,
        ),
      );
      expect
        .soft(
          scan.violations.map(({ id, nodes }) => ({ id, count: nodes.length })),
          `${route.key} axe at ${viewport.width}px`,
        )
        .toEqual([]);
    }
    await page.goto(`${routes[3].path}?mode=edit`);
    await expect(
      page.getByRole('heading', { name: 'Chỉnh sửa thông tin chuyến đi' }),
    ).toBeVisible();
    await waitForImages(page);
    await noHorizontalOverflow(page);
    await page.screenshot({ path: info.outputPath('settings-edit.png'), fullPage: true });
    expect(apiRequests).toEqual([]);
  });
}

for (const viewport of [
  { width: 320, height: 600 },
  { width: 1366, height: 520 },
]) {
  test(`CP05 fixture Web routes reflow and controls remain reachable ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.locator(route.selector)).toBeVisible();
      await waitForRoute(page, route.key);
      await waitForImages(page);
      await noHorizontalOverflow(page);
      if (route.key === 'create') {
        const name = page.getByLabel('Tên chuyến đi');
        await name.focus();
        await expect(name).toBeFocused();
      }
      if (route.key === 'settings') {
        const edit = page.getByRole('button', { name: 'Chỉnh sửa thông tin' });
        await edit.scrollIntoViewIfNeeded();
        await expect(edit).toBeInViewport();
      }
      await page.screenshot({ path: info.outputPath(`${route.key}.png`) });
    }
  });
}

test('CP05 fixture reduced-motion Trip drawer returns keyboard focus', async ({ page }, info) => {
  await page.setViewportSize({ width: 402, height: 600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/trips/${tripId}`);
  await expect(page.locator('[data-flow="trip-overview"]')).toBeVisible();
  const trigger = page.getByRole('button', { name: 'Mở điều hướng chuyến đi' });
  await trigger.focus();
  await trigger.press('Enter');
  const drawer = page.getByRole('dialog', { name: 'Điều hướng chuyến đi' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Đóng điều hướng chuyến đi' })).toBeFocused();
  await drawer.getByRole('link', { name: 'Cài đặt', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('trip-drawer-reduced-motion.png') });
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
    .not.toBe('hidden');
});
