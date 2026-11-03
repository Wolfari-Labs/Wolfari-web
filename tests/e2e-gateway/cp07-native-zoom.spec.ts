import { chromium, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, login, test as gatewayTest, type GatewayModel } from './gateway-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';
const tripPath = `/trips/${tripId}`;
const planPath = `/api/v1/trips/${tripId}/plan`;

// The extension needs a persistent Chromium profile. Override only Playwright's
// page fixture so the existing Gateway fixture still owns every API mock.
const test = gatewayTest.extend({
  page: async ({ baseURL }, use) => {
    if (!baseURL) throw new Error('Gateway test baseURL is required');
    const extension = fileURLToPath(new URL('../e2e/native-zoom-extension/', import.meta.url));
    const context = await chromium.launchPersistentContext('', {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath(),
      baseURL,
      headless: true,
      viewport: null,
      reducedMotion: 'reduce',
      args: [
        '--window-size=1440,900',
        `--disable-extensions-except=${path.resolve(extension)}`,
        `--load-extension=${path.resolve(extension)}`,
      ],
    });
    try {
      await use(context.pages()[0] ?? (await context.newPage()));
    } finally {
      await context.close();
    }
  },
});

async function mockPlan(page: Page, gateway: GatewayModel) {
  const trip = gateway.trips.find((item) => item.id === tripId)!;
  await page.route(`**${planPath}`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      json: {
        data: {
          trip_id: tripId,
          plan_version: trip.plan_version,
          export_revision: trip.export_revision,
          activities: [
            {
              id: '55555555-1111-4111-8111-111111111111',
              trip_id: tripId,
              title: 'Đi bộ sáng',
              position: 0,
              description: null,
              public_description: null,
              activity_type: 'WALK',
              selected_location_id: '66666666-1111-4111-8111-111111111111',
              scheduled_date: '2026-11-02',
              starts_at: null,
              ends_at: null,
              status: 'TODO',
              source: 'MANUAL',
              plan_version: 1,
              created_by_user_id: gateway.profile.id,
              completed_by_user_id: null,
              completed_at: null,
            },
          ],
          selected_locations: [
            {
              id: '66666666-1111-4111-8111-111111111111',
              trip_id: tripId,
              name: 'Bãi biển Mỹ Khê',
              address: 'Đà Nẵng',
              latitude: null,
              longitude: null,
              provider: null,
              provider_place_id: null,
              source: 'MANUAL',
              opening_hours: null,
              fetched_at: null,
              metadata: {},
              plan_version: 1,
            },
          ],
          dress_codes: [
            {
              id: '88888888-1111-4111-8111-111111111111',
              trip_id: tripId,
              scope_type: 'TRIP',
              plan_date: null,
              activity_id: null,
              label: 'Trang phục thoáng mát',
              description: 'Áo nhẹ cho cả chuyến',
              public_description: null,
              source: 'MANUAL',
              plan_version: 1,
            },
          ],
          packing_items: [
            {
              id: '99999999-1111-4111-8111-111111111111',
              trip_id: tripId,
              name: 'Áo mưa',
              quantity: '2',
              unit: 'cái',
              note: 'Cho ngày mưa',
              category: 'Quần áo',
              assigned_member_id: trip.current_membership.id,
              due_at: '2026-11-01T10:00:00Z',
              status: 'COMPLETED',
              source: 'MANUAL',
              completed_by_user_id: gateway.profile.id,
              completed_at: '2026-11-01T08:00:00Z',
              plan_version: 1,
            },
          ],
          permissions: { can_read: true, can_edit: true, can_complete: true },
        },
        meta: { correlation_id: 'cp07-native-zoom' },
      },
    });
  });
}

test('CP07 Gateway Map, Dress and Packing fit native Chrome 200% zoom', async ({
  page,
  gateway,
  baseURL,
}, info) => {
  test.setTimeout(90000);
  await mockPlan(page, gateway);
  const writes: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes(`/api/v1/trips/${tripId}/`) && request.method() !== 'GET')
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  await login(page);

  const context = page.context();
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const before = await page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio }));
  const factor = await worker.evaluate(async (origin) => {
    const browser = (
      globalThis as unknown as {
        chrome: {
          tabs: {
            query(query: { url: string }): Promise<{ id?: number }[]>;
            setZoom(id: number, factor: number): Promise<void>;
            getZoom(id: number): Promise<number>;
          };
        };
      }
    ).chrome;
    const [tab] = await browser.tabs.query({ url: `${origin}/*` });
    if (tab?.id === undefined) throw new Error('Local Gateway tab not found');
    await browser.tabs.setZoom(tab.id, 2);
    return browser.tabs.getZoom(tab.id);
  }, new URL(baseURL!).origin);
  expect(factor).toBe(2);
  await expect.poll(() => page.evaluate(() => devicePixelRatio)).toBe(before.dpr * 2);
  const after = await page.evaluate(() => ({
    width: innerWidth,
    dpr: devicePixelRatio,
    cssZoom: getComputedStyle(document.documentElement).zoom,
  }));
  expect(Math.abs(after.width * 2 - before.width)).toBeLessThanOrEqual(2);
  expect(after.cssZoom).toBe('1');
  await writeFile(
    info.outputPath('native-zoom.json'),
    JSON.stringify({ factor, before, after }, null, 2),
  );

  const capture = await context.newCDPSession(page);
  const saveBrowserSurface = async (name: string) => {
    const shot = await capture.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    const bytes = Buffer.from(shot.data, 'base64');
    await info.attach(name, { body: bytes, contentType: 'image/png' });
    await writeFile(info.outputPath(name), bytes);
  };
  try {
    await page.goto(`${tripPath}/map`);
    const map = page.locator('[data-flow="gateway-map-read"]');
    await expect(map.getByRole('button', { name: /Bãi biển Mỹ Khê/ })).toBeVisible();
    const search = map.getByRole('searchbox', { name: 'Tìm địa điểm đã lưu' });
    await search.focus();
    await page.keyboard.press('Tab');
    await expect(map.getByRole('button', { name: 'Tất cả' })).toBeFocused();
    await expect(map.getByText('Bản đồ nền chưa khả dụng')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await saveBrowserSurface('native-zoom-map.png');

    await page.goto(`${tripPath}/dress-code`);
    const dress = page.locator('[data-flow="gateway-dress-read"]');
    await expect(dress.getByRole('heading', { name: 'Trang phục thoáng mát' })).toBeVisible();
    const allDress = dress.getByRole('button', { name: 'Tất cả' });
    await allDress.focus();
    await page.keyboard.press('Tab');
    await expect(dress.getByRole('button', { name: 'Cả chuyến' })).toBeFocused();
    await expect(dress.getByRole('complementary', { name: 'Khả năng Dress code' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await saveBrowserSurface('native-zoom-dress.png');

    await page.goto(`${tripPath}/packing`);
    const packing = page.locator('[data-flow="packing-read"][data-mode="gateway-readonly"]');
    await expect(packing.getByText('Áo mưa', { exact: true })).toBeVisible();
    await expect(packing.getByText('1/1 món đã hoàn thành')).toBeVisible();
    const category = packing.getByRole('button', { name: /Quần áo/ });
    await category.focus();
    await page.keyboard.press('Enter');
    await expect(category).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect(category).toHaveAttribute('aria-expanded', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await saveBrowserSurface('native-zoom-packing.png');
    expect(writes).toEqual([]);
  } finally {
    await capture.detach();
  }
});
