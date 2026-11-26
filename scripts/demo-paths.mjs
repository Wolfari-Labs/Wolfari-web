import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';

export const webRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const { WOLFARI_DEMO_BACKEND_ROOT } = loadEnv('demo', webRoot, 'WOLFARI_DEMO_');
export const backendRoot = resolve(webRoot, WOLFARI_DEMO_BACKEND_ROOT || '../Wolfari-backend');
export const backendFile = (path) => pathToFileURL(resolve(backendRoot, path));
