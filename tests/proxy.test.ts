// @vitest-environment node
import { createServer as createHttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createServer as createViteServer } from 'vite';
import { expect, it } from 'vitest';
import config from '../vite.config';

it('forwards the same-origin API path and correlation through the configured Vite proxy', async () => {
  const configured = config.server?.proxy?.['/api/v1'];
  if (!configured || typeof configured === 'string') throw new Error('Missing Gateway proxy');
  expect(configured.target).toBe('http://127.0.0.1:3000');
  const requests: string[] = [];
  // Ephemeral test upstream; does not start, modify, or use the Backend repository.
  const upstream = createHttpServer((request, response) => {
    requests.push(request.url ?? '');
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('X-Correlation-Id', 'proxy-test');
    response.end(JSON.stringify({ data: [], meta: { correlation_id: 'proxy-test' } }));
  });
  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const upstreamPort = (upstream.address() as AddressInfo).port;
  let server: Awaited<ReturnType<typeof createViteServer>> | undefined;
  try {
    server = await createViteServer({
      configFile: false,
      server: {
        ...config.server,
        port: 0,
        strictPort: false,
        hmr: false,
        proxy: { '/api/v1': { ...configured, target: `http://127.0.0.1:${upstreamPort}` } },
      },
    });
    await server.listen();
    const port = (server.httpServer!.address() as AddressInfo).port;
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/trips?limit=2`);
    expect(response.status).toBe(200);
    expect(requests).toEqual(['/api/v1/trips?limit=2']);
    expect(response.headers.get('X-Correlation-Id')).toBe('proxy-test');
    expect(await response.json()).toEqual({ data: [], meta: { correlation_id: 'proxy-test' } });
  } finally {
    await server?.close();
    upstream.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      upstream.close((error) => (error ? reject(error) : resolve())),
    );
  }
}, 10_000);
