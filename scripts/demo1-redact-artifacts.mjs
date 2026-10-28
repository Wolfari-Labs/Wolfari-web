import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../test-results/demo1');
/** Mechanical redaction of generated test artifacts only; never reads .local secrets. */
export async function redactArtifacts(directory) {
  const target = resolve(directory), scope = relative(root, target);
  if (isAbsolute(scope) || !/^\d{14}-[0-9a-f]{8}$/.test(scope)) throw Error('INVALID_ARTIFACT_SCOPE');
  let changed = 0;
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = resolve(folder, entry.name);
      if (entry.isSymbolicLink()) throw Error('ARTIFACT_SYMLINK_REFUSED');
      if (entry.isDirectory()) { await walk(path); continue; }
      if (!entry.isFile() || !/\.(?:json|md|txt)$/.test(entry.name)) continue;
      const raw = await readFile(path, 'utf8');
      const safe = raw
        .replace(/D1-[0-9a-f-]{36}-9!/gi, '[REDACTED_TEST_PASSWORD]')
        .replace(/([?&](?:token|code)=)[A-Za-z0-9._~%-]+/gi, '$1[REDACTED]')
        .replace(/Bearer [A-Za-z0-9._~%-]+/g, 'Bearer [REDACTED]')
        .replace(/("(?:access_token|refresh_token|csrf_token|password|cookie)"\s*:\s*")[^"\r\n]*(")/gi, '$1[REDACTED]$2')
        .replace(/\b(?:123456789|987654321)\b/g, '[REDACTED_TEST_ACCOUNT]');
      if (safe !== raw) { await writeFile(path, safe); changed++; }
    }
  }
  await walk(target);
  return changed;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = resolve(root, process.argv[2] ?? '');
  console.log('Redacted generated artifact files: ' + await redactArtifacts(directory));
}
