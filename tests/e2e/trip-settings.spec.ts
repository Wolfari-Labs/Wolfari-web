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
    await expect(page.getByRole('dialog', { name: 'Cài đặt chuyến đi' })).toHaveCount(0);
    await expect(page.getByLabel('Chọn ảnh bìa')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Thành viên chuyến đi' })).toHaveCount(0);
    await expect(
      page
        .locator('[data-region="trip-hero"]')
        .getByRole('link', { name: 'Xem thành viên chuyến đi', exact: true }),
    ).toHaveAttribute('href', `${trip}/members`);
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
    const trigger = page.getByRole('button', { name: 'Cài đặt chuyến đi', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Cài đặt chuyến đi', exact: true });
    await expect(dialog).toBeVisible();
    const navigation = dialog.getByRole('navigation', { name: 'Mục cài đặt chuyến đi' });
    await expect(navigation.getByRole('button')).toHaveText([
      'Chỉnh sửa thông tin',
      'Thông báo',
      'Xuất plan',
      'Lưu trữ chuyến đi',
    ]);
    await expect(navigation.getByRole('button', { name: 'Thành viên', exact: true })).toHaveCount(
      0,
    );
    await expect(dialog.getByLabel('Chọn ảnh bìa')).toHaveCount(0);
    await expect(dialog.getByRole('textbox')).toHaveCount(0);
    await expect(
      dialog.getByRole('button', { name: 'Chỉnh sửa tên chuyến đi', exact: true }),
    ).toBeVisible();
    for (const [section, heading] of [
      ['Thông báo', 'Thông báo của bạn'],
      ['Xuất plan', 'Xuất plan'],
      ['Lưu trữ chuyến đi', 'Lưu trữ chuyến đi'],
      ['Chỉnh sửa thông tin', 'Chỉnh sửa thông tin chuyến đi'],
    ] as const) {
      const tab = navigation.getByRole('button', { name: section, exact: true });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-pressed', 'true');
      await expect(dialog.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      if (section === 'Xuất plan') {
        await expect(
          dialog.getByText('Xuất PDF chưa khả dụng trong chế độ dữ liệu hiện tại.', {
            exact: true,
          }),
        ).toBeVisible();
      }
    }
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({
      path: test.info().outputPath(`settings-overlay-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
    await dialog.getByRole('button', { name: 'Đóng cài đặt chuyến đi' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(settings);
    await expect(trigger).toBeFocused();
  });
}

test('Owner enters edit from Settings, saves supported fields and returns to view', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(settings);
  await page.getByRole('button', { name: 'Cài đặt chuyến đi' }).click();
  await expect(page).toHaveURL(`${settings}?mode=edit`);
  const dialog = page.getByRole('dialog', { name: 'Cài đặt chuyến đi' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Chỉnh sửa tên chuyến đi', exact: true }).click();
  const name = dialog.getByRole('textbox', { name: 'Tên chuyến đi' });
  await expect(name).toHaveValue('Đà Nẵng – Hội An');
  await expect(name).toBeFocused();
  await expect(page.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
  await name.fill('Đà Nẵng cuối tuần');
  await dialog.getByRole('button', { name: 'Chỉnh sửa mô tả chuyến đi', exact: true }).click();
  await page.getByRole('textbox', { name: 'Mô tả chuyến đi' }).fill('');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page).toHaveURL(settings);
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Đã lưu thông tin chuyến đi.')).toBeVisible();
  await expect(page.getByText('Đà Nẵng cuối tuần', { exact: true }).first()).toBeVisible();
});

test('Hero edit and mobile drawer both navigate to Settings view', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto(trip);
  await page.getByRole('link', { name: 'Chỉnh sửa', exact: true }).click();
  await expect(page).toHaveURL(settings);
  await page.getByRole('button', { name: /Mở điều hướng chuyến đi/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Điều hướng chuyến đi' });
  await expect(drawer.getByRole('link', { name: 'Cài đặt', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
});
