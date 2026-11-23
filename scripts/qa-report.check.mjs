import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { allocate, vietnamDate, outcome, writeReports, escapeHtml } from '../tests/qa/report-core.mjs';
test('Ngày báo cáo theo Việt Nam, không theo timezone máy chạy', () => {
  assert.equal(vietnamDate(new Date('2026-11-12T17:00:00Z')), '2026-11-13');
  assert.equal(vietnamDate(new Date('2026-11-12T16:59:59Z')), '2026-11-12');
});
test('Lượt chạy không ghi đè lịch sử', () => {
  const root = mkdtempSync(join(tmpdir(), 'wolfari-qa-'));
  const first = allocate(root, '2026-11-12');
  writeFileSync(join(first.directory, 'sentinel.txt'), 'history');
  const second = allocate(root, '2026-11-12');
  assert.equal(first.run, 'Lan01'); assert.equal(second.run, 'Lan02');
  assert.equal(readFileSync(join(first.directory, 'sentinel.txt'), 'utf8'), 'history');
});
test('Phân loại không biến skip, lỗi hoặc interrupted thành Passed', () => {
  assert.equal(outcome({ status: 'skipped' }, [{ type: 'BLOCKED' }]), 'BLOCKED');
  assert.equal(outcome({ status: 'skipped' }, [{ type: 'SPEC_BLOCKED' }]), 'SPEC_BLOCKED');
  assert.equal(outcome({ status: 'skipped' }), 'SKIPPED');
  assert.equal(outcome({ status: 'interrupted' }), 'NOT RUN');
  assert.equal(outcome({ status: 'failed' }, [{ type: 'BLOCKED' }]), 'FAILED');
  assert.equal(outcome({ status: 'passed' }), 'PASSED');
});
test('HTML tự chứa, evidence tương đối, coverage không thổi phồng', () => {
  // Synthetic records only exercise reporter mechanics in OS temp, never BaoCaoKiemThu.
  const root = mkdtempSync(join(tmpdir(), 'wolfari-reporter-check-'));
  const run = allocate(root, '2026-11-12');
  const metadata = { ...run, root, mode: 'full', startedVietnam: 'kiểm tra reporter', environment: 'REPORTER_SELF_TEST', commit: 'test' };
  const rows = [{ id: 'SELF-01', title: '<script>alert(1)</script>', module: 'DangNhap', srs: ['FR-ID-02'], project: 'chromium', retry: 0, status: 'PASSED', attachments: [{ name: 'log.txt', body: Buffer.from('evidence') }] }];
  const { coverage } = writeReports(metadata, rows, [{ id: 'FR-ID-02', scope: 'WEB', status: 'NOT RUN' }]);
  const html = readFileSync(join(root, run.date, 'DangNhap', run.run, `KetQua_DangNhap_${run.date}_${run.run}.html`), 'utf8');
  assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'));
  assert.ok(existsSync(join(root, run.date, 'DangNhap', run.run, rows[0].evidence[0])));
  assert.equal(coverage[0].status, 'NOT RUN');
  assert.equal(escapeHtml('"&'), '&quot;&amp;');
  assert.ok(existsSync(join(root, run.date, `TongHop_KiemThuWeb_${run.date}_${run.run}.html`)));
});
