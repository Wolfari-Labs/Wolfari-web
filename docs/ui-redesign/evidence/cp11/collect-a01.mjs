// Copy only bounded screenshot/axe/color evidence; never request bodies or credentials.
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const run = '.local/cp11-a01-final-gateway';
const destination = new URL('./', import.meta.url);
const copies = [
  ['ui-acceptance-Gateway-visual-and-accessibility-1440x900/plan.png', 'gateway-plan-a01-1440.png'],
  ['ui-acceptance-Gateway-visual-and-accessibility-402x874/plan.png', 'gateway-plan-a01-402.png'],
  ['ui-acceptance-Gateway-visual-and-accessibility-1440x900/plan-axe.json', 'plan-a01-axe.json'],
  [
    'ui-acceptance-Gateway-visual-and-accessibility-1440x900/plan-breadcrumb-colors.json',
    'plan-a01-colors.json',
  ],
  [
    'cp11-plan-native-zoom-CP11-bcc27--fit-native-Chrome-200-zoom/native-zoom.json',
    'plan-native-zoom.json',
  ],
  [
    'cp11-plan-native-zoom-CP11-bcc27--fit-native-Chrome-200-zoom/plan-editor-native-zoom.png',
    'plan-editor-native-zoom.png',
  ],
];
const hashes = [];
for (const [source, output] of copies) {
  const input = path.join(run, source);
  await copyFile(input, new URL(output, destination));
  const bytes = await readFile(input);
  hashes.push({
    file: output,
    source: input,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
const report = JSON.parse(await readFile(`${run}.json`, 'utf8'));
const baselineFindings = [];
function visit(suite) {
  for (const spec of suite.specs ?? []) {
    if (!spec.file.includes('cp06-composition')) continue;
    for (const test of spec.tests) {
      for (const result of test.results) {
        for (const attachment of result.attachments ?? []) {
          if (attachment.name === 'axe-initial.json') {
            if (!attachment.body) throw new Error('Expected inline axe attachment');
            baselineFindings.push({
              title: spec.title,
              violations: JSON.parse(Buffer.from(attachment.body, 'base64').toString('utf8')),
            });
          }
        }
      }
    }
  }
  (suite.suites ?? []).forEach(visit);
}
report.suites.forEach(visit);
if (baselineFindings.length !== 5) throw new Error('Expected five CP06 composition scans');
const findings =
  JSON.stringify(
    {
      mode: 'HTTP mocks; default all-rules axe, retained baseline findings, not full accessibility PASS',
      baselineFindings,
    },
    null,
    2,
  ) + '\n';
await writeFile(new URL('shell-label-findings.json', destination), findings);
hashes.push({
  file: 'shell-label-findings.json',
  source: `${run}.json inline axe attachments`,
  sha256: createHash('sha256').update(findings).digest('hex'),
});
await writeFile(
  new URL('a01-evidence-sha256.json', destination),
  JSON.stringify(hashes, null, 2) + '\n',
);
console.log(JSON.stringify(hashes, null, 2));
