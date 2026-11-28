import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const read = p => readFileSync(resolve(root, p), 'utf8');
const walk = dir => readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
const source = JSON.parse(read('docs/qa/srs-source.json'));
const pattern = /^(?:\d+\.\d+\.\d+\. )?((?:FR|IR|NFR)-[A-Z0-9]+-\d{2}|(?:BR|DR|AT)-\d{2})(?:\s*[–—-]\s*(.*))?$/;
const requirements = [];
for (let i = 700; i < 2600; i++) {
  const match = source.paragraphs[i]?.match(pattern);
  if (!match || requirements.some(r => r.id === match[1])) continue;
  let end = i + 1;
  while (end < source.paragraphs.length && !pattern.test(source.paragraphs[end]) && !/^\d+\.\d+(?:\.\d+)?\.\s/.test(source.paragraphs[end])) end++;
  const body = source.paragraphs.slice(i + 1, end).filter(Boolean);
  requirements.push({ id: match[1], title: match[2] || body[0], paragraph: i + 1, body });
}
function moduleOf(id) {
  if (id === 'FR-ID-04') return 'HoSo';
  if (id.startsWith('FR-ID')) return 'DangNhap';
  if (/FR-TR-0[234]/.test(id)) return 'ThanhVienLoiMoi';
  if (/FR-TR-(08|09|10)/.test(id) || id === 'IR-UI-05') return 'ChiaSeCongKhai';
  if (id.startsWith('FR-TR')) return 'QuanLyChuyenDi';
  if (/FR-PL-0[1234]/.test(id)) return 'QuyenSuaKeHoach';
  if (id.startsWith('FR-PL')) return 'LichTrinh';
  if (id.startsWith('FR-LOC')) return 'BanDoDiaDiem';
  if (id === 'FR-PK-01') return 'TrangPhuc';
  if (id.startsWith('FR-PK')) return 'HanhLy';
  if (id.startsWith('FR-DSS')) return 'GoiYThongMinh';
  if (id.startsWith('FR-FIN')) return 'QuyNhom';
  if (id.startsWith('FR-PW')) return 'TheoDoiGiaVe';
  if (id.startsWith('FR-NT')) return 'ThongBao';
  if (id.startsWith('FR-EX')) return 'XuatDuLieu';
  if (id === 'FR-AD-01' || id === 'IR-UI-04') return 'QuanTriWeb';
  return 'ChatLuongWeb';
}
const excluded = ['IR-UI-03', 'IR-HW-02', 'FR-FIN-09', 'AT-21'];
const specBlocked = ['NFR-PER-01', 'NFR-REL-04', 'NFR-USA-02', 'AT-20'];
const missing = /^(FR-EX-|FR-TR-0[356789]$|FR-TR-10$|FR-FIN-06$|FR-PW-0[35]$|FR-AD-01$)/;
for (const r of requirements) {
  r.module = moduleOf(r.id);
  r.scope = excluded.includes(r.id) ? 'OUT_OF_SCOPE_NATIVE' : ['AT-25','NFR-COMP-01'].includes(r.id) ? 'WEB_PART_ONLY' : 'WEB_DIRECT_OR_INDIRECT';
  r.implementation = excluded.includes(r.id) ? 'OUT_OF_SCOPE' : missing.test(r.id) ? 'MISSING_OR_PARTIAL' : 'REQUIRES_LIVE_VERIFICATION';
  r.status = specBlocked.includes(r.id) ? 'SPEC_BLOCKED' : 'NOT RUN';
  r.reason = specBlocked.includes(r.id) ? 'OQ-05/06/08 cần phê duyệt điều kiện định lượng.' : 'Chưa có bằng chứng thực thi đầy đủ cho yêu cầu.';
}
const cases = requirements.filter(r => r.scope !== 'OUT_OF_SCOPE_NATIVE').flatMap(r => {
  const acceptance = r.body.indexOf('Tiêu chí chấp nhận:');
  const criteria = acceptance >= 0 ? r.body.slice(acceptance + 1) : r.body;
  return [{ id: `TC-${r.id}-AC`, srs: [r.id], module: r.module, title: r.title,
    priority: /FR-(ID|FIN|PL|TR)|NFR-SEC/.test(r.id) ? 'P0' : 'P1',
    preconditions: ['Môi trường TEST được xác nhận, Backend thật và Web gateway cùng phiên bản đã ghi nhận.', 'Dataset riêng theo Run ID; actor/role và trạng thái theo từng tiêu chí dưới đây.'],
    steps: ['Đọc toàn bộ tiêu chí nguồn và chuẩn bị dữ liệu cho từng nhánh; không dùng native client.', 'Thực hiện thao tác Web của yêu cầu với actor hợp lệ và actor bị từ chối; đối chiếu request/response thật.', 'Tải lại bằng context riêng, đối chiếu trạng thái, lịch sử và dữ liệu trước/sau; ghi bằng chứng cho từng tiêu chí.'],
    expected: criteria, automation: 'DESIGNED_NOT_AUTOMATED', status: r.status,
    note: 'Ca kiểm chứng cấp yêu cầu, chưa phải script hoặc ca chi tiết nguyên tử; không tự coi bao phủ đầy đủ chỉ vì đã có dòng trong ma trận.' }];
});
const files = walk('src').filter(p => /\.(tsx?|css)$/.test(p));
const repositories = files.filter(p => p.endsWith('.ts') && (p.startsWith('src/infrastructure/') || p.includes('/model/')));
const endpoints = repositories.flatMap(file => read(file).split('\n').flatMap((line, index) => line.includes('/api/v1/') ? [{ file, line: index + 1, contract: line.trim() }] : []));
const tests = walk('tests').filter(p => /\.spec\.(ts|mjs)$/.test(p) && !p.includes('e2e-srs'));
const inventory = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceHash: source.sha256,
  routes: [...read('src/app/router.tsx').matchAll(/path: '([^']+)'/g)].map(m => m[1]),
  files: files.map(file => ({ file, lines: read(file).split('\n').length })), endpoints,
  tests: tests.map(file => ({ file, mode: file.includes('e2e-gateway') ? 'HTTP_MOCK' : /e2e-live|e2e-demo1/.test(file) ? 'LIVE_REQUIRES_ENV_REVIEW' : 'FIXTURE', cases: (read(file).match(/\btest\(/g) || []).length })) };
const implemented = walk('tests/e2e-srs').filter(p => p.endsWith('.spec.ts')).flatMap(file => [...read(file).matchAll(/detail\('([^']+)',\s*\[([^\]]+)\],\s*'([^']+)'/g)].map(m => ({ id: m[1], srs: [...m[2].matchAll(/'([^']+)'/g)].map(x => x[1]), module: m[3], file, automation: 'IMPLEMENTED_UNVERIFIED_LIVE' })));
for (const route of ['login', 'register', 'forgot-password']) implemented.push({ id: `UX-${route}`, srs: ['IR-UI-01','NFR-USA-01','IR-HW-01'], module: 'ChatLuongWeb', file: 'tests/e2e-srs/quality/quality.spec.ts', automation: 'IMPLEMENTED_UNVERIFIED_LIVE' });
for (const r of requirements) r.automatedCases = implemented.filter(t => t.srs.includes(r.id)).map(t => t.id);
mkdirSync(resolve(root, 'docs/qa'), { recursive: true });
for (const [name, data] of Object.entries({ requirements, 'requirement-cases': cases, 'automated-cases': implemented, inventory })) writeFileSync(resolve(root, `docs/qa/${name}.json`), JSON.stringify(data, null, 2) + '\n');
writeFileSync(resolve(root, 'docs/qa/TRACEABILITY.md'), '# Ma trận truy vết SRS v1.2\n\nSinh từ SRS thật; mã gốc, đoạn nguồn và toàn bộ tiêu chí nằm trong requirements.json. Đây là coverage thiết kế, không phải kết quả chạy. Ca cấp yêu cầu: requirement-cases.json; kịch bản chi tiết: scenarios.json. Script viết mới: automated-cases.json. Không coi một assertion là toàn bộ yêu cầu.\n\n| SRS | Chức năng | Yêu cầu | Phạm vi | Trạng thái ban đầu | Script hiện có |\n|---|---|---|---|---|---|\n' + requirements.map(r => `| ${r.id} | ${r.module} | ${r.title.replaceAll('|', '/')} | ${r.scope} | ${r.status} | ${r.automatedCases.join(', ') || 'Chưa có trong suite mới'} |`).join('\n') + '\n');
console.log(JSON.stringify({ requirements: requirements.length, cases: cases.length, routes: inventory.routes.length, endpoints: endpoints.length, existingSpecFiles: tests.length, root: relative(process.cwd(), root) }));
