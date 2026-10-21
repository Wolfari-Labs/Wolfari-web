import { expect, test } from '@playwright/test';

const trip = '/trips/11111111-1111-4111-8111-111111111111';
const settings = `${trip}/settings`;
const viewports = [
  { width: 1440, height: 960 },
  { width: 1366, height: 600 },
  { width: 1024, height: 600 },
  { width: 768, height: 1024 },
  { width: 402, height: 874 },
  { width: 320, height: 480 },
] as const;

for (const viewport of viewports) {
  test(`Trip Settings view is reachable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(settings);
    await expect(page.getByRole('heading', { name: 'Thông tin chuyến đi' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Quản lý thành viên' })).toHaveAttribute(
      'href',
      `${trip}/members`,
    );
    const overflow = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);
    expect(overflow.body).toBeLessThanOrEqual(overflow.viewport);
    if (viewport.width > 768) {
      await expect(
        page.getByRole('navigation', { name: 'Điều hướng chuyến đi' }).getByRole('link', {
          name: 'Cài đặt',
          exact: true,
        }),
      ).toHaveAttribute('aria-current', 'page');
    }
    await page.screenshot({
      path: test.info().outputPath(`settings-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  });
}

test('Owner enters edit from Settings, saves supported fields and returns to view', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(settings);
  await page.getByRole('button', { name: 'Chỉnh sửa thông tin' }).click();
  await expect(page).toHaveURL(`${settings}?mode=edit`);
  const name = page.getByRole('textbox', { name: 'Tên chuyến đi' });
  await expect(name).toHaveValue('Đà Nẵng – Hội An');
  await expect(page.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
  await name.fill('Đà Nẵng cuối tuần');
  await page.getByRole('textbox', { name: 'Mô tả chuyến đi' }).fill('');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page).toHaveURL(settings);
  await expect(page.getByText('Đã lưu thông tin chuyến đi.')).toBeVisible();
  await expect(page.getByText('Đà Nẵng cuối tuần', { exact: true }).first()).toBeVisible();
});

test('Hero edit and mobile drawer both navigate to Settings view', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto(trip);
  await page.getByRole('link', { name: 'Chỉnh sửa', exact: true }).click();
  await expect(page).toHaveURL(settings);
  await page.getByRole('button', { name: 'Mở điều hướng chuyến đi' }).click();
  const drawer = page.getByRole('dialog', { name: 'Điều hướng chuyến đi' });
  await expect(drawer.getByRole('link', { name: 'Cài đặt', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
});
