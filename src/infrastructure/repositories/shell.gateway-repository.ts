import type { ShellRepository } from '../../features/shell/repositories/shell.repository';

// Phase 4 supplies a verified Identity/Trip reader. There is no invented /shell API.
export type GatewayShellReader = ShellRepository['read'];

export function createGatewayShellRepository(reader?: GatewayShellReader): ShellRepository {
  return {
    read:
      reader ??
      (async ({ signal }) => {
        signal.throwIfAborted();
        return {
          status: 'error',
          error: {
            code: 'SERVICE_UNAVAILABLE',
            correlationId: null,
            retryable: false,
          },
        };
      }),
  };
}
