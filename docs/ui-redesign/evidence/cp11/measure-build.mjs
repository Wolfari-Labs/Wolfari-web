// Static build-payload evidence only: not actual transfer, LCP, CLS or INP.
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import os from 'node:os';

const buildRoot = path.resolve(process.argv[2] ?? '.local/cp11-production');
const output = process.argv[3];
const manifestBytes = await readFile(path.join(buildRoot, '.vite/manifest.json'));
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const entry = Object.keys(manifest).find((key) => manifest[key].isEntry && key === 'index.html');
if (!entry) throw new Error('Expected index.html application entry in build manifest');
const measurements = new Map();
async function measure(file) {
  if (!measurements.has(file)) {
    const absolute = path.resolve(buildRoot, file);
    if (!absolute.startsWith(buildRoot + path.sep)) throw new Error('Asset outside build root');
    const bytes = await readFile(absolute);
    measurements.set(file, {
      file,
      bytes: bytes.length,
      gzipBytes: gzipSync(bytes).length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  return measurements.get(file);
}
function staticClosure(keys) {
  const nodes = new Set();
  const files = new Set();
  function visit(key) {
    if (nodes.has(key)) return;
    const node = manifest[key];
    if (!node) throw new Error(`Missing manifest import: ${key}`);
    nodes.add(key);
    files.add(node.file);
    for (const css of node.css ?? []) files.add(css);
    for (const dependency of node.imports ?? []) visit(dependency);
  }
  keys.forEach(visit);
  return [...files].filter((file) => /\.(js|css)$/.test(file)).sort();
}
async function payload(keys) {
  const files = await Promise.all(staticClosure(keys).map(measure));
  return {
    bytes: files.reduce((sum, item) => sum + item.bytes, 0),
    gzipBytes: files.reduce((sum, item) => sum + item.gzipBytes, 0),
    files,
  };
}
const routeSources = {
  home: null,
  auth: 'src/features/auth/AuthPage.tsx',
  plan: 'src/features/plan/PlanPage.tsx',
  fund: 'src/features/fund/FundPage.tsx',
};
const routes = {};
for (const [route, source] of Object.entries(routeSources)) {
  if (source && !manifest[source]) throw new Error(`Missing route chunk: ${source}`);
  routes[route] = await payload(source ? [entry, source] : [entry]);
}
async function listAssets(directory) {
  const files = [];
  for (const name of await readdir(directory)) {
    const absolute = path.join(directory, name);
    if ((await stat(absolute)).isDirectory()) files.push(...(await listAssets(absolute)));
    else files.push(path.relative(buildRoot, absolute).split(path.sep).join('/'));
  }
  return files;
}
const assets = await Promise.all((await listAssets(path.join(buildRoot, 'assets'))).map(measure));
const scriptAssets = assets.filter((asset) => asset.file.endsWith('.js'));
const forbiddenMarkers = ['fixtureViewerId', 'previewTripId', 'createFixtureTripRepository'];
const markerHits = [];
for (const asset of scriptAssets) {
  const content = await readFile(path.join(buildRoot, asset.file), 'utf8');
  for (const marker of forbiddenMarkers)
    if (content.includes(marker)) markerHits.push({ file: asset.file, marker });
}
const report = {
  scope: 'Static manifest JS/CSS closure plus emitted assets; no runtime/network measurement',
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpu: os.cpus()[0]?.model,
  },
  buildRoot,
  manifestSha256: createHash('sha256').update(manifestBytes).digest('hex'),
  limits: [
    'Home is the entry static closure, not a measured browser request graph.',
    'Route closures include entry + route static imports, excluding dynamic imports, images and fonts.',
    'gzipBytes sums per-file local gzip output, not server encoding or actual wire bytes.',
    'Nested dynamic feature chunks require runtime loading and are listed separately.',
    'No approved PERF01 SLA, production p75, LCP/CLS/INP, or before/after speed claim.',
    'Marker scan is heuristic; source/runtime boundary tests remain authoritative.',
  ],
  routes,
  dynamicEntries: Object.entries(manifest)
    .filter(([, value]) => value.isDynamicEntry)
    .map(([source, value]) => ({ source, file: value.file })),
  emitted: { count: assets.length, bytes: assets.reduce((sum, item) => sum + item.bytes, 0) },
  largestAssets: [...assets].sort((a, b) => b.bytes - a.bytes).slice(0, 10),
  fonts: assets.filter((asset) => /\.woff2?$/.test(asset.file)),
  fixtureMarkerHits: markerHits,
};
if (output) await writeFile(path.resolve(output), JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      routes: Object.fromEntries(
        Object.entries(routes).map(([name, result]) => [
          name,
          { bytes: result.bytes, gzipBytes: result.gzipBytes, files: result.files.length },
        ]),
      ),
      emitted: report.emitted,
      largestAssets: report.largestAssets.slice(0, 3),
      fixtureMarkerHits: markerHits,
    },
    null,
    2,
  ),
);
