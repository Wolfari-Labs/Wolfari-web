import { expect, type Locator } from '@playwright/test';

/** The left border is the rail: only a following activity may extend it past its card. */
export async function expectTimelineRails(rows: Locator, count: number) {
  await expect(rows).toHaveCount(count);
  const geometry = await rows.evaluateAll((elements) =>
    elements.map((element) => {
      const row = element.getBoundingClientRect();
      const card = element.querySelector('[data-timeline-card]')!.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        top: row.top,
        bottom: row.bottom,
        cardTop: card.top,
        cardBottom: card.bottom,
        gap: Number.parseFloat(style.paddingBottom),
        railWidth: Number.parseFloat(style.borderLeftWidth),
        railStyle: style.borderLeftStyle,
      };
    }),
  );
  geometry.forEach((row, index) => {
    expect(row.railWidth).toBe(2);
    expect(row.railStyle).toBe('solid');
    expect(Math.abs(row.top - row.cardTop)).toBeLessThanOrEqual(1);
    const next = geometry[index + 1];
    if (next) {
      expect(row.gap).toBeGreaterThan(0);
      expect(row.bottom).toBeGreaterThan(row.cardBottom);
      expect(Math.abs(row.bottom - next.top)).toBeLessThanOrEqual(1);
    } else {
      expect(row.gap).toBe(0);
      expect(Math.abs(row.bottom - row.cardBottom)).toBeLessThanOrEqual(1);
    }
  });
}
