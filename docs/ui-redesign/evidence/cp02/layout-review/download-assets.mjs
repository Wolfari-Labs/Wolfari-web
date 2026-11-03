// Download exact exported Figma assets for this isolated CP02 review artifact.
// The manifest is passed once on stdin; temporary URLs are never persisted.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
let input = '';
for await (const chunk of process.stdin) input += chunk;
const sources = JSON.parse(input);
const target = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets');
await fs.mkdir(target, { recursive: true });
for (const [name, url] of Object.entries(sources)) {
  if (!/^img\w+$/.test(name)) throw new Error('Invalid asset name');
  const ext = new URL(url).pathname.endsWith('.svg') ? '.svg' : '.png';
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(path.join(target, name + ext), bytes, { flag: 'wx' });
  console.log(`${name + ext}: ${bytes.length} bytes`);
}
