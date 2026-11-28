import AxeBuilder from '@axe-core/playwright';
import { test, expect, detail, login } from '../fixtures';
for (const route of ['/login', '/register', '/forgot-password']) {
  const id = `UX-${route.slice(1)}`;
  test(`${id} axe và responsive ${route}`, detail(id, ['IR-UI-01', 'NFR-USA-01', 'IR-HW-01'], 'ChatLuongWeb'), async ({ page }, info) => {
    await page.goto(route);
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    await info.attach('axe.json', { body: JSON.stringify(results), contentType: 'application/json' });
    expect(results.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}
test('UX-KEYBOARD Email và mật khẩu nhận focus qua Tab', detail('UX-KEYBOARD', ['IR-UI-01', 'NFR-USA-01'], 'ChatLuongWeb'), async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toBeFocused();
});
test('SEC-STORAGE Không lưu token trong Web storage', detail('SEC-STORAGE', ['NFR-SEC-03'], 'ChatLuongWeb'), async ({ page }, info) => {
  await login(page, info);
  const keys = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
  expect(keys.local).toEqual(['wolfari:session-boundary:v1']);
  expect(keys.session).toEqual([]);
});
