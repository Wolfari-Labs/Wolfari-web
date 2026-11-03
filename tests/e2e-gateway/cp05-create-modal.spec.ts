import AxeBuilder from '@axe-core/playwright';
import { expect, login, test } from './gateway-fixture';

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 402, height: 874 },
]) {
  test(`CP05 Gateway Create success dialog focus and accessibility ${viewport.width}`, async ({
    page,
    gateway,
  }) => {
    await page.setViewportSize(viewport);
    await login(page);
    await page.goto('/trips/new');

    const name = page.getByRole('textbox', { name: 'Tên chuyến đi' });
    const create = page.getByRole('button', { name: 'Tạo chuyến đi', exact: true });
    const fillAndCreate = async (tripName: string) => {
      await name.fill(tripName);
      await page.getByLabel('Ngày đi').fill('2026-12-10');
      await page.getByLabel('Ngày về').fill('2026-12-12');
      await create.click();
      const dialog = page.getByRole('dialog', { name: 'Chuyến đi đã sẵn sàng' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('link', { name: /Mở chuyến đi/ })).toBeFocused();
      return dialog;
    };
    const createCalls = () =>
      gateway.calls.filter((call) => call.method === 'POST' && call.path === '/api/v1/trips');

    const dialog = await fillAndCreate('Huế Gateway modal');
    expect(createCalls()).toHaveLength(1);

    const scan = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(scan.violations, `Create success dialog ${viewport.width}px`).toEqual([]);

    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);

    await dialog.getByRole('button', { name: 'Đóng thông báo' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(create).toBeFocused();
    await expect(name).toHaveValue('');
    await expect(page.getByLabel('Ngày đi')).toHaveValue('');
    await expect(page.getByLabel('Ngày về')).toHaveValue('');
    expect(createCalls()).toHaveLength(1);

    const nextDialog = await fillAndCreate('Hội An Gateway modal');
    expect(createCalls()).toHaveLength(2);
    await page.keyboard.press('Escape');
    await expect(nextDialog).not.toBeVisible();
    await expect(create).toBeFocused();
    await expect(name).toHaveValue('');
    expect(createCalls()).toHaveLength(2);
  });
}
