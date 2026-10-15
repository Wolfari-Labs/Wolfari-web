import type { MembershipRepository } from '../../features/members/model/members';
export function createGatewayMembershipRepository(
  reader?: MembershipRepository['listMembers'],
): MembershipRepository {
  return {
    listMembers:
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
