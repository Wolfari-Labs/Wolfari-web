export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: 'http' | 'invalid-response' | 'network' | 'timeout',
    readonly status: number | null,
    readonly code: string | null,
    readonly correlationId: string | null,
    readonly retryable: boolean,
    readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
