import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { outcome, writeReports, loadJson } from './report-core.mjs';
export default class VietnameseReporter {
  rows = [];
  errors = [];
  onBegin(config, suite) { this.suite = suite; this.metadata = JSON.parse(readFileSync(process.env.WOLFARI_QA_RUN, 'utf8')); }
  onError(error) { this.errors.push(error.message || String(error)); }
  onTestEnd(test, result) {
    const annotations = [...test.annotations, ...(result.annotations || [])];
    const field = name => annotations.find(a => a.type === name)?.description;
    this.rows.push({ key: test.id, id: field('TC') || test.title.split(' ')[0], title: test.title,
      srs: (field('SRS') || '').split(',').filter(Boolean), module: field('module') || 'ChatLuongWeb',
      project: test.parent.project()?.name || 'unknown', retry: result.retry,
      status: outcome(result, annotations), reason: annotations.filter(a => ['BLOCKED','SPEC_BLOCKED','NOT_RUN','skip'].includes(a.type)).map(a => a.description).join('; '),
      error: result.errors.map(e => e.message).join('\n'), attachments: result.attachments, duration: result.duration });
  }
  onEnd(result) {
    for (const test of this.suite.allTests()) {
      if (this.rows.some(r => r.key === test.id)) continue;
      const field = name => test.annotations.find(a => a.type === name)?.description;
      this.rows.push({ key: test.id, id: field('TC') || test.title.split(' ')[0], title: test.title, srs: (field('SRS') || '').split(',').filter(Boolean), module: field('module') || 'ChatLuongWeb', project: test.parent.project()?.name || 'unknown', retry: 0, status: 'NOT RUN', reason: 'Runner không thực thi ca này.', attachments: [] });
    }
    this.metadata.runnerStatus = result.status;
    this.metadata.finishedAt = new Date().toISOString();
    writeFileSync(join(this.metadata.directory, 'runner-errors.json'), JSON.stringify(this.errors, null, 2));
    writeReports(this.metadata, this.rows, loadJson('docs/qa/requirements.json'), [...loadJson('docs/qa/requirement-cases.json'), ...loadJson('docs/qa/scenarios.json')]);
    if (this.errors.length || !this.rows.length || this.rows.some(r => r.status !== 'PASSED')) return { status: 'failed' };
  }
}
