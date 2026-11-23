import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
const target = resolve(process.argv[2]);
const html = readFileSync(target, 'utf8');
for (const match of html.matchAll(/href="([^"]+)"/g)) {
  if (!existsSync(resolve(dirname(target), match[1]))) throw new Error(`Broken report link: ${match[1]}`);
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(target).href);
  if (await page.locator('html').getAttribute('lang') !== 'vi') throw new Error('Missing Vietnamese lang');
  if (!await page.getByRole('heading', { name: 'Tổng hợp kiểm thử Web' }).isVisible()) throw new Error('Missing report heading');
  const dir = resolve('test-results/qa-report-verification', String(Date.now()));
  mkdirSync(dir, { recursive: true });
  const screenshot = join(dir, 'report.png');
  await page.screenshot({ path: screenshot });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ links: [...html.matchAll(/href=/g)].length, browser: browser.version(), screenshot, errors }));
} finally { await browser.close(); }
