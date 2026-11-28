import { mkdirSync, writeFileSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join, basename, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function vietnamDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function allocate(parent, date = vietnamDate()) {
  const day = join(parent, date);
  mkdirSync(day, { recursive: true });
  for (let n = 1; ; n++) {
    const run = `Lan${String(n).padStart(2, '0')}`;
    const directory = join(day, run);
    try { mkdirSync(directory); return { date, run, directory, id: randomUUID() }; }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
}
export function outcome(result, annotations = []) {
  if (['failed', 'timedOut'].includes(result.status)) return 'FAILED';
  if (result.status === 'interrupted') return 'NOT RUN';
  if (annotations.some(a => a.type === 'SPEC_BLOCKED')) return 'SPEC_BLOCKED';
  if (annotations.some(a => a.type === 'BLOCKED')) return 'BLOCKED';
  if (annotations.some(a => a.type === 'NOT_RUN')) return 'NOT RUN';
  return result.status === 'passed' ? 'PASSED' : 'SKIPPED';
}
export function counts(rows) {
  return Object.fromEntries(['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'NOT RUN', 'SPEC_BLOCKED'].map(s => [s, rows.filter(r => r.status === s).length]));
}
const page = (title, content) => `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title><style>body{font:16px system-ui;margin:2rem;line-height:1.5;color:#182821}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:.6rem;text-align:left;vertical-align:top}pre{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#075ca8}</style><h1>${escapeHtml(title)}</h1>${content}</html>`;
export function writeReports(metadata, rows, requirements = [], planned = []) {
  const dateRoot = join(metadata.root, metadata.date);
  const groups = [...new Set(rows.map(r => r.module))];
  const links = [];
  for (const group of groups) {
    if (!/^[A-Za-z0-9]+$/.test(group)) throw new Error('Unsafe module name');
    const dir = join(dateRoot, group, metadata.run);
    mkdirSync(dir, { recursive: true });
    const groupRows = rows.filter(r => r.module === group);
    for (const row of groupRows) {
      row.evidence = [];
      const evidenceDir = join(dir, 'bang-chung', `${row.id}-${row.project}-${row.retry}`.replace(/[^a-zA-Z0-9_-]/g, '_'));
      mkdirSync(evidenceDir, { recursive: true });
      for (const [i, attachment] of (row.attachments || []).entries()) {
        const name = `${i}-${basename(attachment.path || attachment.name || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const target = join(evidenceDir, name);
        if (attachment.path && existsSync(attachment.path)) copyFileSync(attachment.path, target);
        else if (attachment.body) writeFileSync(target, attachment.body);
        else continue;
        row.evidence.push(relative(dir, target).replaceAll('\\', '/'));
      }
      writeFileSync(join(evidenceDir, 'log.txt'), [row.title, row.status, row.reason, row.error].filter(Boolean).join('\n'));
      row.evidence.push(relative(dir, join(evidenceDir, 'log.txt')).replaceAll('\\', '/'));
    }
    const filename = `KetQua_${group}_${metadata.date}_${metadata.run}.html`;
    const summary = counts(groupRows);
    writeFileSync(join(dir, filename), page(`Kết quả ${group}`, `<p>Ngày giờ: ${escapeHtml(metadata.startedVietnam)} · Môi trường: ${escapeHtml(metadata.environment)} · Run ID: ${metadata.id} · Commit: ${escapeHtml(metadata.commit)}</p><p>Backend: ${escapeHtml(metadata.backendCommit)} · Nguồn giá: ${escapeHtml(metadata.priceSource)}</p><p>Tổng lượt test: ${groupRows.length}; ${escapeHtml(JSON.stringify(summary))}. Retry được liệt kê riêng, không che lỗi lần đầu.</p><table><tr><th>Test Case / SRS</th><th>Browser / Trạng thái</th><th>Lỗi / lý do</th><th>Bằng chứng</th></tr>${groupRows.map(r => `<tr><td>${escapeHtml(r.id)}<br>${escapeHtml(r.title)}<br>${escapeHtml(r.srs.join(', '))}</td><td>${escapeHtml(r.project)}<br>${escapeHtml(r.status)}</td><td><pre>${escapeHtml(r.reason || '')}\n${escapeHtml(r.error || '')}</pre></td><td>${r.evidence.map(e => `<a href="${escapeHtml(e)}">${escapeHtml(basename(e))}</a>`).join('<br>')}</td></tr>`).join('')}</table>`));
    links.push({ group, path: `${group}/${metadata.run}/${filename}`, summary });
  }
  const coverage = requirements.filter(r => r.scope !== 'OUT_OF_SCOPE_NATIVE').map(r => {
    const matching = rows.filter(t => t.srs.includes(r.id));
    const totalPlanned = planned.filter(t => t.srs.includes(r.id));
    // A passing smoke assertion never proves an entire multi-clause requirement.
    const status = matching.some(t => t.status === 'FAILED') ? 'FAILED' : r.status === 'SPEC_BLOCKED' ? 'SPEC_BLOCKED' : matching.some(t => t.status === 'BLOCKED') ? 'BLOCKED' : 'NOT RUN';
    return { id: r.id, status, planned: totalPlanned.length, executed: matching.length, passedAssertions: matching.filter(t => t.status === 'PASSED').length, note: 'Chưa nghiệm thu toàn bộ tiêu chí; xem ca chi tiết và phạm vi từng assertion.' };
  });
  const manifestDir = metadata.directory;
  writeFileSync(join(manifestDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  writeFileSync(join(manifestDir, 'coverage.json'), JSON.stringify(coverage, null, 2));
  writeFileSync(join(manifestDir, 'results.json'), JSON.stringify(rows.map(row => Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'attachments'))), null, 2));
  const title = metadata.mode === 'full' ? 'TongHop_KiemThuWeb' : 'TongHop_SmokeWeb';
  writeFileSync(join(dateRoot, `${title}_${metadata.date}_${metadata.run}.html`), page('Tổng hợp kiểm thử Web', `<p>Run ID: ${metadata.id}; ngày giờ Việt Nam: ${escapeHtml(metadata.startedVietnam)}; môi trường: ${escapeHtml(metadata.environment)}; phạm vi: ${escapeHtml(metadata.mode)}.</p><p>${rows.length} lượt test thực thi. ${escapeHtml(JSON.stringify(counts(rows)))}.</p><p>Không phải chứng nhận đạt toàn bộ SRS. Visual Regression: NOT RUN, chưa có baseline được duyệt cho suite này. Các ca thiết kế chưa thực thi: xem coverage.</p><ul>${links.map(l => `<li><a href="${l.path}">${escapeHtml(l.group)}</a>: ${escapeHtml(JSON.stringify(l.summary))}</li>`).join('')}</ul><p><a href="${metadata.run}/coverage.json">Requirement Coverage</a> · <a href="${metadata.run}/metadata.json">Metadata</a> · <a href="${metadata.run}/playwright-html/index.html">Playwright HTML gốc</a> · <a href="${metadata.run}/junit.xml">JUnit</a></p><table><tr><th>SRS</th><th>Trạng thái nghiệm thu</th><th>Assertions Passed / lượt test</th></tr>${coverage.map(r => `<tr><td>${r.id}</td><td>${r.status}</td><td>${r.passedAssertions}/${r.executed}</td></tr>`).join('')}</table>`));
  return { coverage, links };
}
export function loadJson(path, fallback = []) { return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback; }
