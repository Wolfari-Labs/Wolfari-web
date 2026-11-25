import { test, expect, login } from './gateway-fixture';
import AxeBuilder from '@axe-core/playwright';
test('HTTP mock: unconfigured browser push is truthful, accessible and never requests a token', async ({
  page,
  gateway,
}, info) => {
  expect(gateway.authenticated).toBe(false);
  let writes = 0;
  await page.route('**/api/v1/me/devices**', async (route) => {
    writes++;
    await route.abort();
  });
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'requestPermission', {
      value: () => {
        throw new Error('Permission must not be requested without config');
      },
    });
  });
  await login(page);
  await page.goto('/profile');
  await page
    .getByRole('navigation', { name: 'Điều hướng tài khoản' })
    .getByRole('button', { name: 'Thông báo', exact: true })
    .click();
  const pushToggle = page.locator('summary').filter({ hasText: /^Thiết bị nhận push$/ });
  const groupToggle = page.locator('summary').filter({ hasText: /^Tùy chọn từng nhóm$/ });
  await expect(pushToggle).toBeVisible();
  await expect(groupToggle).toBeVisible();
  await expect(pushToggle.locator('..')).not.toHaveAttribute('open');
  const pushBounds = await pushToggle.boundingBox();
  const groupBounds = await groupToggle.boundingBox();
  expect(pushBounds!.y).toBeLessThan(groupBounds!.y);
  const panel = page.getByRole('group', { name: 'Thông báo trên trình duyệt này' });
  await expect(panel).toBeHidden();
  await page.screenshot({ path: info.outputPath('notification-sections.png'), fullPage: true });
  await pushToggle.click();
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/chưa được thiết lập cho môi trường này/)).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Bật thông báo trình duyệt' })).toBeDisabled();
  for (const width of [1440, 768, 402, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await panel.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).include('fieldset').withTags(['wcag2a', 'wcag2aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({ path: info.outputPath(`push-${width}.png`) });
  }
  await pushToggle.click();
  await expect(panel).toBeHidden();
  expect(writes).toBe(0);
});
