// Read-only documentation/evidence consistency check. Run from repository root.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve('docs/ui-redesign');
const official = path.join(root, 'evidence/figma-official');
const read = (name) => JSON.parse(fs.readFileSync(path.join(official, name), 'utf8'));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const totals = { frames: 0, components: 0, sets: 0, screens: 0 };
const ids = new Set();
for (const key of ['0-1', '310-2025', '194-1073']) {
  const inventory = read(`inventory-${key}.json`);
  const frameIndex = read(`frames-${key}.json`);
  const screens = read(`screens-${key}.json`);
  check(frameIndex.frames.length === inventory.counts.FRAME, `frame count ${key}`);
  check(new Set(frameIndex.frames.map(n => n[0])).size === frameIndex.frames.length, `duplicate frames ${key}`);
  for (const screen of screens) {
    check(!ids.has(screen.id), `duplicate screen ${screen.id}`);
    ids.add(screen.id);
    check(frameIndex.frames.some(n => n[0] === screen.id), `screen absent in index ${screen.id}`);
  }
  check(inventory.components.filter(n => n.type === 'COMPONENT').length === inventory.counts.COMPONENT, `component count ${key}`);
  check(inventory.components.filter(n => n.type === 'COMPONENT_SET').length === inventory.counts.COMPONENT_SET, `set count ${key}`);
  totals.frames += frameIndex.frames.length;
  totals.components += inventory.counts.COMPONENT;
  totals.sets += inventory.counts.COMPONENT_SET;
  totals.screens += screens.length;
}
const variables = read('variables.json');
check(variables.variables.length === 257 && new Set(variables.variables.map(v => v.id)).size === 257, 'variables incomplete/duplicated');
for (const c of variables.collections) check(variables.variables.filter(v => v.collectionId === c.id).length === c.variableCount, `collection mismatch ${c.name}`);
const classification = read('screen-classification.json');
check(classification.length === ids.size && classification.every(s => ids.has(s.id) && s.route && s.classification), 'screen classification coverage');
const shots = fs.readdirSync(official).filter(f => f.endsWith('.png'));
check(shots.length === 18 && classification.filter(s => s.visuallyInspected).length === 18, 'visual coverage count');
for (const s of classification.filter(s => s.visuallyInspected)) check(fs.existsSync(path.join(official, s.id.replace(':', '-') + '.png')), `missing image ${s.id}`);

const routeSource = fs.readFileSync('src/app/router.tsx', 'utf8');
const routes = [...routeSource.matchAll(/path: '([^']+)'/g)].map(m => m[1]);
const matrix = fs.readFileSync(path.join(root, 'ROUTE_MATRIX.md'), 'utf8');
for (const route of routes) {
  const compact = route.replace('/trips/:tripId', 'T');
  check(matrix.includes('`' + compact + '`'), `route undocumented ${route}`);
}

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const markdown = walk(root).filter(f => f.endsWith('.md'));
let localLinks = 0;
for (const file of markdown) {
  const text = fs.readFileSync(file, 'utf8');
  check(!text.includes('smmJSmfpAfJadboA6vgyig'), `invalidated Figma URL in ${file}`);
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^[a-z]+:\/\//i.test(target)) continue;
    localLinks++;
    check(fs.existsSync(path.resolve(path.dirname(file), target)), `missing link ${file}: ${target}`);
  }
}
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const copied = [];
for (const [viewport, screen] of [['1366x520', 'plan'], ['320x600', 'fund'], ['820x900', 'overview'], ['320x600', 'members'], ['1366x520', 'login'], ['820x900', 'create']]) {
  const original = `.local/cp01-baseline/e2e-gateway/ui-acceptance-Gateway-visual-and-accessibility-${viewport}/${screen}.png`;
  const copy = path.join(root, `evidence/baseline/${screen}-${viewport}.png`);
  check(hash(original) === hash(copy), `screenshot changed ${screen}-${viewport}`);
  copied.push({ file: path.relative(root, copy).replaceAll('\\', '/'), sha256: hash(copy) });
}
console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', totals, variables: variables.variables.length, collections: variables.collections.length, routes: routes.length, officialScreenshots: shots.length, markdownFiles: markdown.length, localLinks, copied, failures }, null, 2));
process.exitCode = failures.length ? 1 : 0;
