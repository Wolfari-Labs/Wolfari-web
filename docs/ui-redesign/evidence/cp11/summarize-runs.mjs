// Preserve exact suite outcomes without copying request bodies, tokens or test credentials.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const inputPaths = process.argv.slice(2);
if (!inputPaths.length) throw new Error('Pass existing Vitest/Playwright JSON report paths');
const runs = [];
for (const file of inputPaths) {
  const bytes = await readFile(file);
  const report = JSON.parse(bytes.toString('utf8'));
  const source = { file, sha256: createHash('sha256').update(bytes).digest('hex') };
  if ('numTotalTests' in report) {
    runs.push({
      ...source,
      runner: 'vitest',
      success: report.success,
      total: report.numTotalTests,
      passed: report.numPassedTests,
      failed: report.numFailedTests,
      pending: report.numPendingTests,
    });
    continue;
  }
  const cases = [];
  function visit(suite) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        cases.push({
          file: spec.file,
          line: spec.line,
          title: spec.title,
          status: test.status,
          attempts: test.results.map((result) => ({
            status: result.status,
            durationMs: result.duration,
          })),
        });
      }
    }
    (suite.suites ?? []).forEach(visit);
  }
  report.suites.forEach(visit);
  runs.push({ ...source, runner: 'playwright', stats: report.stats, cases });
}
await writeFile(
  new URL('./run-summary.json', import.meta.url),
  JSON.stringify(
    {
      evidenceDate: '2026-11-02',
      limits:
        'Local fixture/HTTP-mock reports; not live Backend, CI or manual accessibility. Separate runs are never summed into a fictional all-pass suite.',
      runs,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify(
    runs.map(({ cases, ...run }) => ({ ...run, cases: cases?.length })),
    null,
    2,
  ),
);
