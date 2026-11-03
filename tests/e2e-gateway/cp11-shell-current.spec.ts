import { expect, login, test } from './gateway-fixture';

const tripPath = '/trips/11111111-1111-4111-8111-111111111111';

test('CP11 HTTP mock: Trip Drawer has one current page and preserves account navigation', async ({
  page,
  gateway,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await login(page);
  await page.goto(tripPath);
  await expect(page.getByRole('region', { name: 'Thông tin chuyến đi' })).toBeVisible();
  const menu = page.getByRole('button', { name: /Mở điều hướng chuyến đi/ });
  const drawer = page.getByRole('dialog', { name: 'Điều hướng chuyến đi' });
  const nav = drawer.getByRole('navigation', { name: 'Điều hướng chuyến đi' });
  await menu.click();
  await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1);
  await expect(nav.getByRole('link', { name: 'Tổng quan chuyến đi' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(nav.getByRole('link', { name: 'Chuyến đi của tôi' })).not.toHaveAttribute(
    'aria-current',
  );
  await expect(nav.getByRole('link', { name: 'Hồ sơ cá nhân' })).toHaveAttribute(
    'href',
    '/profile',
  );
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(menu).toBeFocused();
  await menu.click();
  await nav.getByRole('link', { name: 'Cài đặt', exact: true }).click();
  await expect(page).toHaveURL(tripPath + '/settings');
  await expect(drawer).not.toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Thông tin chuyến đi', exact: true }),
  ).toBeVisible();
  await expect(page.locator('main')).toBeFocused();
  await menu.click();
  await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1);
  await expect(nav.getByRole('link', { name: 'Cài đặt', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(nav.getByRole('link', { name: 'Chuyến đi của tôi' })).not.toHaveAttribute(
    'aria-current',
  );
  await nav.getByRole('link', { name: 'Chuyến đi của tôi' }).click();
  await expect(page).toHaveURL('/trips');
  await expect(drawer).not.toBeVisible();
  await expect(page.locator('main')).toBeFocused();
  await expect(page.getByText('Đà Nẵng Gateway', { exact: true })).toBeVisible();
  const tripCalls = gateway.calls.filter(
    (call) => call.path === '/api/v1/trips' || call.path.startsWith('/api/v1/trips/'),
  );
  expect(tripCalls.length).toBeGreaterThan(0);
  expect(tripCalls.filter((call) => call.method !== 'GET')).toEqual([]);
});
