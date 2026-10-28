import type {
  MembershipRepository,
  InvitationRepository,
} from '../../features/members/model/members';
import { createGatewayMembershipRepository } from './membership.gateway-repository';
import { createGatewayInvitationRepository } from './invitation.gateway-repository';
import type { GatewayHttpClient } from '../http/http-client';
import type { CommandCoordinator } from '../operations/command-coordinator';
export function selectMembersRepositories(
  mode: string | undefined,
  allowed: boolean,
  factory?: () => { membership: MembershipRepository; invitation: InvitationRepository },
  client?: GatewayHttpClient,
  commands?: CommandCoordinator,
) {
  const selected = mode ?? (allowed ? 'fixture' : 'gateway');
  if (selected !== 'fixture' && selected !== 'gateway') throw Error('Invalid data mode');
  if (selected === 'gateway')
    return {
      membership: createGatewayMembershipRepository(undefined, client, commands),
      invitation: createGatewayInvitationRepository(undefined, client),
    };
  if (!allowed || !factory)
    throw Error('Fixture requires development or explicit UI preview and factory');
  return factory();
}
