import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const apiDir = resolve(process.argv[2] ?? '../Wolfari-backend/docs/api');
const unsupported = [
  ['POST', '/api/v1/trips/{id}/recommendations'],
  ['GET', '/api/v1/trips/{id}/recommendations/{id}'],
  ['POST', '/api/v1/trips/{id}/schedule-validation'],
];
const normalizePath = (path) => path.replace(/\{[^}]+\}/g, '{id}');
const documents = (await readdir(apiDir))
  .filter((name) => name.endsWith('.openapi.json'))
  .map(async (name) => [name, JSON.parse(await readFile(resolve(apiDir, name), 'utf8'))]);
documents.push(
  Promise.all([
    Promise.resolve('runtime-inventory.json'),
    readFile(resolve(apiDir, 'runtime-inventory.json'), 'utf8').then((text) => JSON.parse(text)),
  ]),
);
const loaded = await Promise.all(documents);
const operations = loaded.flatMap(([name, document]) => {
  if (name === 'runtime-inventory.json')
    return document.operations.map((operation) => ({
      source: name,
      method: operation.method,
      path: normalizePath(operation.path),
    }));
  return Object.entries(document.paths ?? {}).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method]) => ({
      source: name,
      method: method.toUpperCase(),
      path: normalizePath(path),
    })),
  );
});
const present = unsupported.flatMap(([method, path]) =>
  operations
    .filter((operation) => operation.method === method && operation.path === path)
    .map((operation) => `${method} ${path} in ${operation.source}`),
);
if (present.length) {
  console.error(`Unsupported Plan routes are advertised:\n${present.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('Plan API contract check passed: recommendation and schedule-validation routes are absent.');
}
