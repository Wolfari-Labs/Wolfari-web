import { ApiError } from './api-error';
import { parseEnvelope } from './envelope';

export interface GatewayReadOptions {
  signal?: AbortSignal;
  includeCredentials?: boolean;
}
export interface GatewayRead {
  data: unknown;
  correlationId: string | null;
}
export interface GatewayWriteOptions {
  method: 'PATCH';
  body: unknown;
  idempotencyKey: string;
  signal?: AbortSignal;
  includeCredentials?: boolean;
}
export interface GatewayHttpClient {
  read(path: string, options?: GatewayReadOptions): Promise<GatewayRead>;
  write(path: string, options: GatewayWriteOptions): Promise<GatewayRead>;
}

function gatewayPath(path: string): string {
  // Parsing base only, never used as a request destination.
  const url = new URL(path, 'https://wolfari.invalid');
  if (
    !path.startsWith('/api/v1/') ||
    path.includes('\\') ||
    url.hash ||
    !url.pathname.startsWith('/api/v1/') ||
    url.origin !== 'https://wolfari.invalid'
  ) {
    throw new Error('Gateway requests require a same-origin /api/v1/ path');
  }
  return url.pathname + url.search;
}

// Endpoint selection and DTO → domain mapping belong to adapters. The transport never retries;
// callers own mutation idempotency and uncertain-outcome recovery.
export function createGatewayHttpClient({
  transport = globalThis.fetch.bind(globalThis),
  getAccessToken = () => null,
  timeoutMs = 15_000,
}: {
  transport?: typeof fetch;
  getAccessToken?: () => string | null;
  timeoutMs?: number;
} = {}): GatewayHttpClient {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Invalid timeout');
  async function request(
    path: string,
    options: GatewayReadOptions | GatewayWriteOptions,
  ): Promise<GatewayRead> {
    const target = gatewayPath(path);
    options.signal?.throwIfAborted();
    const controller = new AbortController();
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', abort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      const write = 'method' in options;
      const headers = new Headers({ Accept: 'application/json', 'X-Client-Type': 'web' });
      if (write) {
        headers.set('Content-Type', 'application/json');
        headers.set('Idempotency-Key', options.idempotencyKey);
      }
      const token = getAccessToken();
      if (token) headers.set('Authorization', 'Bearer ' + token);
      const response = await transport(target, {
        method: write ? options.method : 'GET',
        headers,
        ...(write ? { body: JSON.stringify(options.body) } : {}),
        signal: controller.signal,
        credentials: options.includeCredentials ? 'include' : 'omit',
      });
      const headerCorrelation = response.headers.get('X-Correlation-Id');
      let envelope;
      try {
        envelope = parseEnvelope((await response.json()) as unknown);
      } catch (error) {
        if (controller.signal.aborted) throw error;
        throw new ApiError(
          'Invalid Gateway response',
          'invalid-response',
          response.status,
          null,
          headerCorrelation,
          false,
        );
      }
      const correlationId = envelope.correlationId ?? headerCorrelation;
      if (envelope.kind === 'error') {
        throw new ApiError(
          envelope.message,
          'http',
          response.status,
          envelope.code,
          correlationId,
          envelope.retryable,
          envelope.details,
        );
      }
      if (!response.ok) {
        throw new ApiError(
          'Unexpected Gateway response',
          'invalid-response',
          response.status,
          null,
          correlationId,
          false,
        );
      }
      return { data: envelope.data, correlationId };
    } catch (error) {
      if (options.signal?.aborted) throw options.signal.reason;
      if (timedOut)
        throw new ApiError('Gateway request timed out', 'timeout', null, null, null, true);
      if (error instanceof ApiError) throw error;
      throw new ApiError('Cannot reach Gateway', 'network', null, null, null, true);
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }
  }
  return {
    async read(path, options = {}) {
      return request(path, options);
    },
    async write(path, options) {
      return request(path, options);
    },
  };
}
