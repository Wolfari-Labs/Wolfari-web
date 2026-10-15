import type {
  MembershipRepository,
  InvitationRepository,
} from '../../features/members/model/members';
import { createGatewayMembershipRepository } from './membership.gateway-repository';
import { createGatewayInvitationRepository } from './invitation.gateway-repository';
export function selectMembersRepositories(
  mode: string | undefined,
  allowed: boolean,
  factory?: () => { membership: MembershipRepository; invitation: InvitationRepository },
) {
  const selected = mode ?? (allowed ? 'fixture' : 'gateway');
  if (selected !== 'fixture' && selected !== 'gateway') throw Error('Invalid data mode');
  if (selected === 'gateway')
    return {
      membership: createGatewayMembershipRepository(),
      invitation: createGatewayInvitationRepository(),
    };
  if (!allowed || !factory)
    throw Error('Fixture requires development or explicit UI preview and factory');
  return factory();
}
