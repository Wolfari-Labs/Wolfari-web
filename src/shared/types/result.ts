export interface DomainError {
  code:
    | 'UNAUTHENTICATED'
    | 'VALIDATION_FAILED'
    | 'PERMISSION_DENIED'
    | 'RESOURCE_NOT_FOUND'
    | 'VERSION_CONFLICT'
    | 'STATE_CONFLICT'
    | 'IDEMPOTENCY_CONFLICT'
    | 'RESOURCE_EXHAUSTED'
    | 'FINANCE_OBLIGATION_BLOCKED'
    | 'SERVICE_UNAVAILABLE';
  correlationId: string | null;
  retryable: boolean;
  details?: unknown;
}
export type ReadResult<T> =
  { status: 'ready'; data: T } | { status: 'empty' } | { status: 'error'; error: DomainError };
