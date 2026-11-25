import { expect, test } from '@playwright/test';

const trip = '/trips/11111111-1111-4111-8111-111111111111';
const settings = `${trip}/settings`;
const viewports = [
  { width: 1440, height: 960 },
  { width: 1366, height: 600 },
  { width: 1024, height: 600 },
  { width: 1440, height: 720 },
  { width: 1024, height: 800 },
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
    await expect(
      page.getByRole('heading', { name: 'Cài đặt chuyến đi', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByLabel('Chọn ảnh bìa')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Thông tin chuyến đi' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Thành viên chuyến đi' })).toHaveCount(0);
    const hero = page.locator('[data-region="trip-hero"]');
    await expect(hero).toHaveCount(1);
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-compact', 'true');
    await expect(hero).toHaveAttribute('data-variant', 'landscape');
    await expect(
      hero.getByRole('heading', { name: 'Đà Nẵng – Hội An', exact: true }),
    ).toBeVisible();
    await expect(
      hero.getByRole('link', { name: 'Xem thành viên chuyến đi', exact: true }),
    ).toHaveAttribute('href', `${trip}/members`);
    await expect(hero.getByRole('link', { name: 'Chỉnh sửa', exact: true })).toHaveAttribute(
      'href',
      settings,
    );
    await expect(hero.getByRole('link', { name: 'Chia sẻ', exact: true })).toHaveAttribute(
      'href',
      `${trip}/share`,
    );
    for (const name of [
      'Chỉnh sửa thông tin',
      'Thông báo',
      'Xuất plan',
      'Lưu trữ chuyến đi',
      'Xóa chuyến đi',
    ])
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    const overflow = await page.evaluate(() => ({
      viewport: innerWidth,
      viewportHeight: innerHeight,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      bodyHeight: document.body.scrollHeight,
    }));
    expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);
    expect(overflow.body).toBeLessThanOrEqual(overflow.viewport);
    if (viewport.width > 768) {
      const breadcrumb = page.getByRole('navigation', { name: 'Đường dẫn', exact: true });
      await expect(breadcrumb.getByRole('heading', { name: 'Cài đặt', exact: true })).toBeVisible();
      await expect(
        breadcrumb.getByRole('link', { name: 'Tổng quan chuyến đi', exact: true }),
      ).toHaveAttribute('href', trip);
      const heroBounds = (await hero.boundingBox())!;
      const titleBounds = (await hero
        .getByRole('heading', { name: 'Đà Nẵng – Hội An', exact: true })
        .boundingBox())!;
      const breadcrumbBounds = (await breadcrumb.boundingBox())!;
      const breadcrumbTitleBounds = (await breadcrumb
        .getByRole('heading', { name: 'Cài đặt', exact: true })
        .boundingBox())!;
      expect(heroBounds.height).toBeCloseTo(84, 0);
      expect(Math.abs(breadcrumbBounds.x - titleBounds.x)).toBeLessThanOrEqual(2);
      expect(breadcrumbTitleBounds.y).toBeGreaterThanOrEqual(heroBounds.y);
      expect(breadcrumbTitleBounds.y + breadcrumbTitleBounds.height).toBeLessThanOrEqual(
        titleBounds.y + 1,
      );
      expect(overflow.documentHeight).toBeLessThanOrEqual(overflow.viewportHeight);
      expect(overflow.bodyHeight).toBeLessThanOrEqual(overflow.viewportHeight);
      const intersectingTiles = await page.locator('button[data-section]').evaluateAll((tiles) =>
        tiles.flatMap((tile, index) => {
          const box = tile.getBoundingClientRect();
          return tiles.slice(index + 1).flatMap((other) => {
            const next = other.getBoundingClientRect();
            const horizontalIntersection =
              Math.min(box.right, next.right) - Math.max(box.left, next.left);
            const verticalIntersection =
              Math.min(box.bottom, next.bottom) - Math.max(box.top, next.top);
            return horizontalIntersection > 0.5 && verticalIntersection > 0.5
              ? [[tile.getAttribute('data-section'), other.getAttribute('data-section')]]
              : [];
          });
        }),
      );
      expect(intersectingTiles).toEqual([]);
      const clippedTileContent = await page.locator('button[data-section]').evaluateAll((tiles) =>
        tiles.flatMap((tile) => {
          const bounds = tile.getBoundingClientRect();
          return [...tile.querySelectorAll<HTMLElement>('strong, span[id$="-description"]')]
            .filter((content) => content.getClientRects().length > 0)
            .filter((content) => {
              const box = content.getBoundingClientRect();
              return (
                box.left < bounds.left ||
                box.right > bounds.right + 1 ||
                box.top < bounds.top ||
                box.bottom > bounds.bottom + 1 ||
                content.scrollWidth > content.clientWidth + 1 ||
                content.scrollHeight > content.clientHeight + 1
              );
            })
            .map((content) => content.textContent);
        }),
      );
      expect(clippedTileContent).toEqual([]);
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
    for (const [section, heading] of [
      ['Chỉnh sửa thông tin', 'Chỉnh sửa thông tin chuyến đi'],
      ['Thông báo', 'Thông báo của bạn'],
      ['Xuất plan', 'Xuất plan'],
      ['Lưu trữ chuyến đi', 'Lưu trữ chuyến đi'],
      ['Xóa chuyến đi', 'Xóa chuyến đi'],
    ] as const) {
      const trigger = page.getByRole('button', { name: section, exact: true });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: section, exact: true });
      await expect(dialog).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(1);
      await expect(dialog.getByRole('navigation', { name: 'Mục cài đặt chuyến đi' })).toHaveCount(
        0,
      );
      await expect(
        dialog.getByRole('heading', { name: heading, exact: true }).first(),
      ).toBeVisible();
      for (const [other, otherHeading] of [
        ['Chỉnh sửa thông tin', 'Chỉnh sửa thông tin chuyến đi'],
        ['Thông báo', 'Thông báo của bạn'],
        ['Xuất plan', 'Xuất plan'],
        ['Lưu trữ chuyến đi', 'Lưu trữ chuyến đi'],
        ['Xóa chuyến đi', 'Xóa chuyến đi'],
      ] as const) {
        if (other !== section)
          await expect(
            dialog.getByRole('heading', { name: otherHeading, exact: true, includeHidden: true }),
          ).toHaveCount(0);
      }
      if (section === 'Chỉnh sửa thông tin') {
        await expect(dialog.getByLabel('Chọn ảnh bìa')).toHaveCount(0);
        await expect(dialog.getByRole('textbox')).toHaveCount(0);
        await expect(
          dialog.getByRole('button', { name: 'Chỉnh sửa tên chuyến đi', exact: true }),
        ).toBeVisible();
      }
      if (section === 'Xuất plan') {
        await expect(
          dialog.getByText('Xuất PDF chưa khả dụng trong chế độ dữ liệu hiện tại.', {
            exact: true,
          }),
        ).toBeVisible();
      }
      const bounds = await dialog.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
      if (section === 'Chỉnh sửa thông tin') {
        await page.screenshot({
          path: test.info().outputPath(`settings-overlay-${viewport.width}x${viewport.height}.png`),
          fullPage: true,
        });
      }
      await dialog
        .getByRole('button', { name: `Đóng ${section.toLocaleLowerCase('vi-VN')}`, exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      await expect(page).toHaveURL(settings);
      await expect(trigger).toBeFocused();
    }
  });
}

test('Owner enters edit from Settings, saves supported fields and returns to view', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(settings);
  await page.getByRole('button', { name: 'Chỉnh sửa thông tin', exact: true }).click();
  await expect(page).toHaveURL(`${settings}?mode=edit`);
  const dialog = page.getByRole('dialog', { name: 'Chỉnh sửa thông tin', exact: true });
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
  await page.getByRole('button', { name: 'Chỉnh sửa thông tin', exact: true }).click();
  await expect(
    dialog
      .getByRole('region', { name: 'Chỉnh sửa thông tin chuyến đi', exact: true })
      .getByText('Đà Nẵng cuối tuần', { exact: true }),
  ).toBeVisible();
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
