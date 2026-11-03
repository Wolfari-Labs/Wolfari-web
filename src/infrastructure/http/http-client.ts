import { ApiError } from './api-error';
import { parseEnvelope, type GatewayMetadata } from './envelope';

export interface GatewayReadOptions {
  signal?: AbortSignal;
  includeCredentials?: boolean;
  csrfToken?: string;
  correlationId?: string;
  responseType?: 'json' | 'bytes' | 'empty';
}
export interface GatewayRead {
  data: unknown;
  correlationId: string | null;
  status?: number;
  metadata?: GatewayMetadata;
  contentType?: string | null;
}
export interface GatewayWriteOptions {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  idempotencyKey?: string;
  signal?: AbortSignal;
  includeCredentials?: boolean;
  csrfToken?: string;
  correlationId?: string;
  responseType?: 'json' | 'bytes' | 'empty';
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

function newCorrelationId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function requestBody(body: unknown): { body?: BodyInit; contentType?: string } {
  if (body === undefined) return {};
  if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer) {
    return { body: body as BodyInit };
  }
  if (typeof body === 'string' || body instanceof URLSearchParams) {
    return { body: body as BodyInit };
  }
  return { body: JSON.stringify(body), contentType: 'application/json' };
}

// Endpoint selection and DTO → domain mapping belong to adapters. The transport never retries;
// callers own mutation idempotency and uncertain-outcome recovery.
export function createGatewayHttpClient({
  transport = globalThis.fetch.bind(globalThis),
  getAccessToken = () => null,
  onUnauthorized,
  timeoutMs = 15_000,
}: {
  transport?: typeof fetch;
  getAccessToken?: () => string | null;
  onUnauthorized?: () => Promise<boolean>;
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
      const requestedResponse = options.responseType ?? 'json';
      const headers = new Headers({
        Accept: requestedResponse === 'bytes' ? 'image/png' : 'application/json',
        'X-Client-Type': 'web',
        'X-Correlation-Id': options.correlationId ?? newCorrelationId(),
      });
      if (options.csrfToken) headers.set('X-CSRF-Token', options.csrfToken);
      const serialized = write ? requestBody(options.body) : {};
      if (serialized.contentType) headers.set('Content-Type', serialized.contentType);
      if (write && options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey);
      const token = getAccessToken();
      if (token) headers.set('Authorization', 'Bearer ' + token);
      const response = await transport(target, {
        method: write ? options.method : 'GET',
        headers,
        ...(serialized.body === undefined ? {} : { body: serialized.body }),
        signal: controller.signal,
        credentials: options.includeCredentials ? 'include' : 'omit',
      });
      const headerCorrelation = response.headers.get('X-Correlation-Id');
      if (response.status === 204) {
        return { data: null, correlationId: headerCorrelation, status: response.status };
      }
      if (requestedResponse === 'bytes') {
        if (!response.ok) {
          try {
            const envelope = parseEnvelope((await response.json()) as unknown);
            if (envelope.kind === 'error') {
              throw new ApiError(
                envelope.message,
                'http',
                response.status,
                envelope.code,
                envelope.correlationId ?? headerCorrelation,
                envelope.retryable,
                envelope.details,
              );
            }
          } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(
              'Invalid Gateway response',
              'invalid-response',
              response.status,
              null,
              headerCorrelation,
              false,
            );
          }
        }
        return {
          data: await response.arrayBuffer(),
          correlationId: headerCorrelation,
          status: response.status,
          contentType: response.headers.get('Content-Type'),
        };
      }
      if (requestedResponse === 'empty' && response.ok) {
        return { data: null, correlationId: headerCorrelation, status: response.status };
      }
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
      return {
        data: envelope.data,
        correlationId,
        status: response.status,
        metadata: envelope.metadata,
      };
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
      try {
        return await request(path, options);
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          onUnauthorized &&
          !path.startsWith('/api/v1/auth/')
        ) {
          const refreshed = await onUnauthorized();
          if (refreshed) return request(path, options);
        }
        throw error;
      }
    },
    async write(path, options) {
      return request(path, options);
    },
  };
}
