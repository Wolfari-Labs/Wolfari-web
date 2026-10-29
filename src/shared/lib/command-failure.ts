import { ApiError } from '../../infrastructure/http/api-error';
import { toDomainError } from '../../infrastructure/http/domain-error';
export function commandFailure(error: unknown) {
  return {
    ...toDomainError(error),
    uncertain:
      !(error instanceof ApiError) || error.kind !== 'http' || (error.status ?? 500) >= 500,
    conflict: error instanceof ApiError && error.status === 409,
  };
}
