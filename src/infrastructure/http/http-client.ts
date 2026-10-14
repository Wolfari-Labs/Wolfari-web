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
export interface GatewayHttpClient {
  read(path: string, options?: GatewayReadOptions): Promise<GatewayRead>;
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

// Read-only bootstrap transport. Endpoint selection and DTO → domain mapping belong to adapters.
// No automatic refresh, retry, mutation, or feature endpoint is enabled in Phase 1.
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
  return {
    async read(path, options = {}) {
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
        const headers = new Headers({ Accept: 'application/json', 'X-Client-Type': 'web' });
        const token = getAccessToken();
        if (token) headers.set('Authorization', 'Bearer ' + token);
        const response = await transport(target, {
          method: 'GET',
          headers,
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
    },
  };
}
