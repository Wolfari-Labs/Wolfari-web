// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('single host deployment contract (static checks, not Caddy runtime)', () => {
  const caddy = readFileSync(new URL('../deployment/Caddyfile', import.meta.url), 'utf8');
  it('uses same-origin API, preserves prefix and overwrites client IP', () => {
    expect(caddy).toContain('reverse_proxy 127.0.0.1:3000');
    expect(caddy).not.toContain('handle_path');
    expect(caddy).toContain('header_up X-Real-IP {http.request.remote.host}');
    expect(caddy.indexOf('handle @api')).toBeLessThan(caddy.indexOf('try_files'));
    expect(caddy).toContain('@unknownApi path /api /api/*');
    expect(caddy).toContain('handle @unknownApi');
  });
  it('excludes helpers and avoids access logging secrets', () => {
    expect(caddy).toContain('/api/v1/auth/local/*');
    expect(caddy).toContain('/invitations/local/*');
    expect(caddy).toContain('respond @private 404');
    expect(caddy).not.toMatch(/^\s*log\s*[{\n]/m);
  });
  it('forces gateway production and separate output', () => {
    const script = readFileSync(new URL('../scripts/build-deploy.mjs', import.meta.url), 'utf8');
    expect(script).toContain("process.env.VITE_DATA_MODE = 'gateway'");
    expect(script).toContain("mode: 'production'");
    expect(script).toContain("outDir: 'dist-deploy'");
    const lint = readFileSync(new URL('../eslint.config.js', import.meta.url), 'utf8');
    expect(lint).toContain("'dist-deploy/**'");
  });
});
