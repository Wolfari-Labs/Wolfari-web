export interface DomainError {
  code: 'PERMISSION_DENIED' | 'RESOURCE_NOT_FOUND' | 'VERSION_CONFLICT' | 'SERVICE_UNAVAILABLE';
  correlationId: string | null;
  retryable: boolean;
}
export type ReadResult<T> =
  { status: 'ready'; data: T } | { status: 'empty' } | { status: 'error'; error: DomainError };
