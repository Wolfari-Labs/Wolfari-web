import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = fileURLToPath(new URL('..', import.meta.url));
export function snapshot(root) {
  const git = (...args) =>
    execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true });
  const paths = [
    ...new Set(
      git('ls-files', '--cached', '--others', '--exclude-standard', '-z')
        .split('\0')
        .filter(Boolean),
    ),
  ].sort();
  const hash = createHash('sha256');
  const implementationHash = createHash('sha256');
  for (const path of paths) {
    let bytes;
    try {
      bytes = readFileSync(resolve(root, path));
    } catch (error) {
      if (error.code === 'ENOENT') bytes = '<deleted>';
      else throw error;
    }
    hash.update(path).update('\0').update(bytes).update('\0');
    // Include code, tests, assets, configs, lockfile and scripts. Exclude only
    // documentation, which is updated with results after a run has completed.
    if (!path.startsWith('docs/') && !/\.(?:md|docx)$/i.test(path))
      implementationHash.update(path).update('\0').update(bytes).update('\0');
  }
  return {
    branch: git('branch', '--show-current').trim(),
    head: git('rev-parse', 'HEAD').trim(),
    treeSha256: hash.digest('hex'),
    implementationSha256: implementationHash.digest('hex'),
    fileCount: paths.length,
    status: git('status', '--short').trim(),
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(
    JSON.stringify(
      {
        at: new Date().toISOString(),
        web: snapshot(web),
        backend: snapshot(resolve(web, '../Wolfari-backend')),
      },
      null,
      2,
    ),
  );
}
