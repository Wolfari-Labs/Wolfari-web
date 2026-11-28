import { expect, type Locator } from '@playwright/test';

/** Include transparent pseudo-elements that extend small Figma glyphs into clickable targets. */
export async function expectMinimumHitTargets(controls: Locator) {
  const targets = await controls.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      let target = { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      for (const pseudo of ['::before', '::after']) {
        const style = getComputedStyle(element, pseudo);
        if (
          style.content === 'none' ||
          style.content === 'normal' ||
          style.position !== 'absolute' ||
          style.pointerEvents === 'none'
        )
          continue;
        const matrix = new DOMMatrixReadOnly(
          style.transform === 'none' ? undefined : style.transform,
        );
        const left = box.left + (parseFloat(style.left) || 0) + matrix.m41;
        const top = box.top + (parseFloat(style.top) || 0) + matrix.m42;
        target = {
          left: Math.min(target.left, left),
          right: Math.max(target.right, left + (parseFloat(style.width) || 0)),
          top: Math.min(target.top, top),
          bottom: Math.max(target.bottom, top + (parseFloat(style.height) || 0)),
        };
      }
      // Overflow containers clip pseudo hit areas too. Measure the region users can reach.
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        const clip = parent.getBoundingClientRect();
        if (style.overflowX !== 'visible' && parent.scrollWidth <= parent.clientWidth) {
          target.left = Math.max(target.left, clip.left);
          target.right = Math.min(target.right, clip.right);
        }
        if (style.overflowY !== 'visible' && parent.scrollHeight <= parent.clientHeight) {
          target.top = Math.max(target.top, clip.top);
          target.bottom = Math.min(target.bottom, clip.bottom);
        }
      }
      return {
        name: element.getAttribute('aria-label') || element.textContent || element.tagName,
        width: target.right - target.left,
        height: target.bottom - target.top,
      };
    }),
  );
  for (const target of targets) {
    expect(target.width, target.name).toBeGreaterThanOrEqual(44);
    expect(target.height, target.name).toBeGreaterThanOrEqual(44);
  }
}
