import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.name === 'runtime-metrics.json') files.push(full);
  }
  return files;
}
function stats(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return {
    min: sorted[0],
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    max: sorted.at(-1),
  };
}
const runs = [];
for (const directory of process.argv.slice(2)) {
  const reports = await Promise.all(
    (await walk(directory))
      .sort()
      .map(async (file) => ({ file, ...JSON.parse(await readFile(file, 'utf8')) })),
  );
  runs.push({
    directory,
    reports,
    summary: reports.map((report) => ({
      route: report.route,
      width: report.width,
      samples: report.samples.length,
      lcpMs: stats(report.samples.map((sample) => sample.lcp)),
      cls: stats(report.samples.map((sample) => sample.cls)),
      readyMs: stats(report.samples.map((sample) => sample.readyMs)),
      resourceTransferBytes: stats(
        report.samples.map((sample) =>
          sample.resources.reduce((total, entry) => total + entry.transferBytes, 0),
        ),
      ),
      editorEventDurationMs: stats(
        report.samples.flatMap((sample) =>
          (sample.editorEventTiming ?? [])
            .filter((event) => event.name === 'click')
            .map((event) => event.duration),
        ),
      ),
    })),
  });
}
if (
  runs.length !== 2 ||
  runs.some(
    (run) => run.reports.length !== 8 || run.reports.some((report) => report.samples.length !== 5),
  )
)
  throw new Error('Expected two complete runs, each with 8 route/viewport groups of 5 samples');
const comparison = runs[1].summary.map((after) => {
  const before = runs[0].summary.find(
    (candidate) => candidate.route === after.route && candidate.width === after.width,
  );
  if (!before) throw new Error('Missing baseline route/viewport');
  return {
    route: after.route,
    width: after.width,
    beforeLcpMedian: before.lcpMs.median,
    afterLcpMedian: after.lcpMs.median,
    lcpMedianDeltaPercent: (after.lcpMs.median / before.lcpMs.median - 1) * 100,
    beforeClsMedian: before.cls.median,
    afterClsMedian: after.cls.median,
  };
});
await writeFile(
  new URL('./runtime-lab.json', import.meta.url),
  JSON.stringify(
    {
      date: '2026-11-02',
      method:
        'Sequential pre-A01 then post-A01 local HTTP-mock built runs; 5 cache-disabled samples per Home/Auth/Plan/Fund at 1440/402. Unthrottled localhost and CPU1, fixed observation cutoff. Not production p75/INP or approved SLA. Compare range/noise, not just medians.',
      comparison,
      runs,
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify({ comparison, after: runs[1].summary }, null, 2));
