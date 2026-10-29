import AxeBuilder from '@axe-core/playwright';
import { test, expect, login } from './gateway-fixture';
const tripId = '11111111-1111-4111-8111-111111111111';
test('Gateway Home uses the branded public presentation with real motion and no fixture controls', async ({
  page,
  gateway,
}) => {
  void gateway;
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('[data-layout="home-hero"]')).toBeVisible();
  await expect(page.locator('[data-preview]')).toHaveCount(0);
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 402, height: 874 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({
      path: `test-results/ui-upgrade/home-gateway-${viewport.width}.png`,
      fullPage: true,
    });
  }
});
test('Inbox reads from API, survives a later-page error and preferences preserve overrides', async ({
  page,
  gateway,
}) => {
  void gateway;
  let read = false,
    failNext = true,
    preferences = {
      push_enabled: false,
      email_enabled: true,
      group_overrides: { PRICE: { email: false } },
      version: 2,
    };
  await page.route('**/api/v1/me/notifications*', (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.has('cursor') && failNext) {
      failNext = false;
      return route.fulfill({
        status: 503,
        json: {
          error: { code: 'SERVICE_UNAVAILABLE', message: 'retry', retryable: true },
          meta: {},
        },
      });
    }
    const item = {
      id: '99999999-1111-4111-8111-111111111111',
      type: 'PLAN_UPDATED',
      title: 'Lịch trình có cập nhật',
      body: 'Mở chuyến đi để xem chi tiết.',
      trip_id: tripId,
      source_id: null,
      status: 'AVAILABLE',
      created_at: '2026-10-29T10:00:00Z',
      read_at: read ? '2026-10-29T11:00:00Z' : null,
    };
    const empty =
      url.searchParams.has('cursor') || (url.searchParams.get('unread') === 'true' && read);
    return route.fulfill({
      json: { data: empty ? [] : [item], meta: { next_cursor: empty ? null : 'opaque+/cursor=' } },
    });
  });
  await page.route('**/api/v1/me/notifications/*/read', (route) => {
    read = true;
    return route.fulfill({
      json: {
        data: {
          id: '99999999-1111-4111-8111-111111111111',
          type: 'PLAN_UPDATED',
          title: 'Lịch trình có cập nhật',
          body: '',
          trip_id: tripId,
          source_id: null,
          status: 'AVAILABLE',
          created_at: '2026-10-29T10:00:00Z',
          read_at: '2026-10-29T11:00:00Z',
        },
        meta: {},
      },
    });
  });
  await page.route('**/api/v1/me/notification-preferences', (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      expect(body.expected_version).toBe(2);
      expect(body.group_overrides).toEqual({ PRICE: { email: false } });
      preferences = { ...body, version: 3 };
    }
    return route.fulfill({ json: { data: preferences, meta: {} } });
  });
  await login(page);
  await page
    .getByRole('button', { name: 'Thông báo · Có tin chưa đọc' })
    .filter({ visible: true })
    .click();
  const inbox = page.getByRole('dialog', { name: 'Thông báo', exact: true });
  await expect(inbox.getByText('Lịch trình có cập nhật')).toBeVisible();
  await inbox.getByRole('button', { name: 'Tải thêm', exact: true }).click();
  await expect(inbox.getByText('Lịch trình có cập nhật')).toBeVisible();
  await inbox.getByRole('button', { name: 'Thử lại' }).click();
  await inbox.getByRole('button', { name: 'Đánh dấu đã đọc' }).click();
  await expect(inbox.getByRole('button', { name: 'Đánh dấu đã đọc' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('switch', { name: 'Cho phép email' }).uncheck();
  await page.getByRole('button', { name: 'Lưu tùy chọn' }).click();
  await expect(page.getByText('Đã lưu tùy chọn thông báo.', { exact: true })).toBeVisible();
});
test('Price Watch create retries the same idempotency key after unknown result, then pause/resume/stop', async ({
  page,
  gateway,
}) => {
  let saved: Record<string, unknown> | null = null,
    first = true;
  const keys: string[] = [];
  const respond = (data: unknown) => ({ json: { data, meta: { next_cursor: null } } });
  await page.route('**/api/v1/trips/*/price-watches*', (route) => {
    if (route.request().method() === 'GET') return route.fulfill(respond(saved ? [saved] : []));
    const body = route.request().postDataJSON();
    keys.push(route.request().headers()['idempotency-key']!);
    expect(body.passengers).toEqual({ adults: 1, children: 0, infants: 0 });
    saved = {
      id: '99999999-2222-4222-8222-222222222222',
      trip_id: tripId,
      user_id: gateway.profile.id,
      status: 'ACTIVE',
      status_reason: null,
      version: 1,
      expires_at: '2030-01-01T00:00:00Z',
      threshold_price: body.threshold_price,
      normalized_query: { ...body, transport_type: 'FLIGHT' },
    };
    if (first) {
      first = false;
      return route.abort('failed');
    }
    return route.fulfill(respond(saved));
  });
  await page.route('**/api/v1/price-watches/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/observations')) return route.fulfill(respond([]));
    expect(route.request().postDataJSON().expected_version).toBe(saved?.version);
    saved = {
      ...saved,
      status: path.endsWith('/pause') ? 'PAUSED' : path.endsWith('/resume') ? 'ACTIVE' : 'STOPPED',
      version: Number(saved?.version) + 1,
    };
    return route.fulfill(respond(saved));
  });
  await login(page);
  await page.goto(`/trips/${tripId}/price-watch`);
  await page.getByRole('button', { name: 'Tạo theo dõi', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Tạo theo dõi giá' });
  await form.getByLabel('Sân bay đi (IATA)').fill('DAD');
  await form.getByLabel('Sân bay đến (IATA)').fill('SGN');
  await form.getByLabel('Ngày khởi hành').fill('2030-01-02');
  await form.getByLabel('Ngưỡng cảnh báo (VND)').fill('1500000');
  await form.getByRole('button', { name: 'Lưu theo dõi' }).click();
  await expect(form.getByText('Chưa xác nhận kết quả.', { exact: false })).toBeVisible();
  await form.getByRole('button', { name: 'Gửi lại đúng yêu cầu cũ' }).click();
  await expect(form).not.toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tiếp tục', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('button', { name: 'Lịch sử giá' }).click();
  await expect(page.getByText('Chưa có giá quan sát.', { exact: false })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Dừng', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByText('Đã dừng', { exact: true })).toBeVisible();
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations).toEqual([]);
  await page.screenshot({
    path: 'test-results/ui-upgrade/price-watch-gateway.png',
    fullPage: true,
  });
});
