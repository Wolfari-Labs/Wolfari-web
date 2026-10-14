import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGatewayHttpClient } from '../src/infrastructure/http/http-client';
import { parseEnvelope } from '../src/infrastructure/http/envelope';
import { createAccessTokenStore } from '../src/infrastructure/session/access-token-store';

afterEach(() => vi.useRealTimers());
const success = () =>
  new Response(
    JSON.stringify({
      data: { id: 'fixture-http-only' },
      meta: { correlation_id: 'correlation-test' },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
describe('unconnected Gateway transport foundation', () => {
  it('keeps token in one memory store and sends only same-origin GET with cookies omitted', async () => {
    const store = createAccessTokenStore();
    const otherStore = createAccessTokenStore();
    store.set('test-token-not-a-secret');
    const transport = vi.fn<typeof fetch>().mockResolvedValue(success());
    const client = createGatewayHttpClient({ transport, getAccessToken: store.get });
    expect(await client.read('/api/v1/me')).toEqual({
      data: { id: 'fixture-http-only' },
      correlationId: 'correlation-test',
    });
    const [path, request] = transport.mock.calls[0]!;
    expect(path).toBe('/api/v1/me');
    expect(request?.method).toBe('GET');
    expect(request?.credentials).toBe('omit');
    expect(new Headers(request?.headers).get('Authorization')).toBe(
      'Bearer test-token-not-a-secret',
    );
    expect(otherStore.get()).toBeNull();
    expect(localStorage.length + sessionStorage.length).toBe(0);
    store.clear();
    transport.mockResolvedValue(success());
    await client.read('/api/v1/me');
    expect(new Headers(transport.mock.calls[1]![1]?.headers).has('Authorization')).toBe(false);
  });
  it('cookie reads are explicitly requested and keep Web client mode', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(success());
    await createGatewayHttpClient({ transport }).read('/api/v1/auth/csrf', {
      includeCredentials: true,
    });
    const request = transport.mock.calls[0]![1];
    expect(request?.credentials).toBe('include');
    expect(new Headers(request?.headers).get('X-Client-Type')).toBe('web');
  });
  it.each([
    'https://other.invalid/api/v1/me',
    '//other.invalid/api/v1/me',
    '/api/v1/../../me',
    '/api/v1/..\\..\\me',
    '/api/v1/me#private',
    '/me',
  ])('refuses an invalid transport destination %s before attaching credentials', async (path) => {
    const transport = vi.fn<typeof fetch>();
    await expect(createGatewayHttpClient({ transport }).read(path)).rejects.toThrow('same-origin');
    expect(transport).not.toHaveBeenCalled();
  });
  it('retains conflict revision details and correlation evidence without retrying', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'VERSION_CONFLICT',
            message: 'Dữ liệu đã thay đổi',
            retryable: false,
            details: { plan_version: 3 },
          },
          meta: { correlation_id: 'conflict-test' },
        }),
        { status: 409 },
      ),
    );
    await expect(createGatewayHttpClient({ transport }).read('/api/v1/me')).rejects.toMatchObject({
      kind: 'http',
      status: 409,
      code: 'VERSION_CONFLICT',
      correlationId: 'conflict-test',
      details: { plan_version: 3 },
      retryable: false,
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('rejects non-JSON response and preserves header correlation ID', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('<html>unavailable</html>', {
        status: 503,
        headers: { 'X-Correlation-Id': 'upstream-test' },
      }),
    );
    await expect(createGatewayHttpClient({ transport }).read('/api/v1/me')).rejects.toMatchObject({
      kind: 'invalid-response',
      status: 503,
      correlationId: 'upstream-test',
      retryable: false,
    });
  });
  it('normalizes a network error without leaking the transport error text', async () => {
    const transport = vi.fn<typeof fetch>().mockRejectedValue(new Error('private request context'));
    await expect(createGatewayHttpClient({ transport }).read('/api/v1/me')).rejects.toMatchObject({
      kind: 'network',
      message: 'Cannot reach Gateway',
      status: null,
      retryable: true,
    });
  });
  it('honors already-cancelled reads before sending a request', async () => {
    const controller = new AbortController();
    controller.abort();
    const transport = vi.fn<typeof fetch>();
    await expect(
      createGatewayHttpClient({ transport }).read('/api/v1/me', { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(transport).not.toHaveBeenCalled();
  });
  it('cancels a pending read when its context goes away', async () => {
    const controller = new AbortController();
    const transport = vi.fn<typeof fetch>().mockImplementation(
      (_path, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(options.signal?.reason), {
            once: true,
          });
        }),
    );
    const pending = createGatewayHttpClient({ transport }).read('/api/v1/me', {
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('bounds pending reads with timeout and performs no automatic retry', async () => {
    vi.useFakeTimers();
    const transport = vi.fn<typeof fetch>().mockImplementation(
      (_path, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(options.signal?.reason), {
            once: true,
          });
        }),
    );
    const pending = createGatewayHttpClient({ transport, timeoutMs: 50 }).read('/api/v1/me');
    const assertion = expect(pending).rejects.toMatchObject({ kind: 'timeout', retryable: true });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it.each([
    null,
    [],
    { data: {} },
    { data: {}, error: {}, meta: {} },
    { error: { code: 'VERSION_CONFLICT' }, meta: {} },
    { data: {}, meta: { correlation_id: 7 } },
  ])('rejects malformed envelope %#', (value) => {
    expect(() => parseEnvelope(value)).toThrow();
  });
});
