import type { InvitationRepository } from '../../features/members/model/members';
export function createGatewayInvitationRepository(
  reader?: InvitationRepository['listInvitations'],
): InvitationRepository {
  return {
    listInvitations:
      reader ??
      (async ({ signal }) => {
        signal.throwIfAborted();
        return {
          status: 'error',
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: false },
        };
      }),
  };
}
