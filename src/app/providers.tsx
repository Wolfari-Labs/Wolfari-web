import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ShellRepository } from '../features/shell/repositories/shell.repository';
import { createQueryClient } from './query-client';
import { ShellRepositoryProvider } from '../features/shell/repositories/repository-context';
import type { TripRepository } from '../features/trips/repositories/trip.repository';
import { TripRepositoryProvider } from '../features/trips/repositories/repository-context';
import { IdentityRepositoryProvider } from '../features/auth/repositories/identity-context';
import type { IdentityRepository } from '../features/auth/model/identity';
import { HomeRepositoryProvider } from '../features/home/repositories/home-context';
import type { HomeRepository } from '../features/home/model/home';
import type { PlanRepository } from '../features/plan/model/plan';
import { PlanRepositoryProvider } from '../features/plan/repositories/plan-context';
import type { MembershipRepository, InvitationRepository } from '../features/members/model/members';
import { MembersRepositoryProvider } from '../features/members/repositories/members-context';
import type { FundRepository } from '../features/fund/model/fund';
import { FundRepositoryProvider } from '../features/fund/repositories/fund-context';
import type { PriceWatchRepository } from '../features/price-watch/model/price-watch';
import { PriceWatchRepositoryProvider } from '../features/price-watch/repositories/price-watch-context';
import type { SessionManagerLike } from './session-context';
import { SessionManagerProvider } from './session-context';
import { GatewayContext } from './gateway-context';
import type { RuntimeServices } from '../shared/types/runtime-services';

export function Providers({
  repository,
  tripRepository,
  identityRepository,
  homeRepository,
  planRepository,
  membersRepositories,
  fundRepository,
  priceWatchRepository,
  sessionManager,
  runtimeServices,
  children,
}: {
  repository: ShellRepository;
  tripRepository?: TripRepository;
  identityRepository?: IdentityRepository;
  homeRepository?: HomeRepository;
  planRepository?: PlanRepository;
  membersRepositories?: { membership: MembershipRepository; invitation: InvitationRepository };
  fundRepository?: FundRepository;
  priceWatchRepository?: PriceWatchRepository;
  sessionManager?: SessionManagerLike;
  runtimeServices?: RuntimeServices;
  children: ReactNode;
}) {
  const [client] = useState(createQueryClient);
  const membersContent = membersRepositories ? (
    <MembersRepositoryProvider {...membersRepositories}>{children}</MembersRepositoryProvider>
  ) : (
    children
  );
  const fundContent = fundRepository ? (
    <FundRepositoryProvider repository={fundRepository}>{membersContent}</FundRepositoryProvider>
  ) : (
    membersContent
  );
  const priceWatchContent = priceWatchRepository ? (
    <PriceWatchRepositoryProvider repository={priceWatchRepository}>
      {fundContent}
    </PriceWatchRepositoryProvider>
  ) : (
    fundContent
  );
  const planContent = planRepository ? (
    <PlanRepositoryProvider repository={planRepository}>{priceWatchContent}</PlanRepositoryProvider>
  ) : (
    priceWatchContent
  );
  const homeContent = homeRepository ? (
    <HomeRepositoryProvider repository={homeRepository}>{planContent}</HomeRepositoryProvider>
  ) : (
    planContent
  );
  const content = identityRepository ? (
    <IdentityRepositoryProvider repository={identityRepository}>
      {homeContent}
    </IdentityRepositoryProvider>
  ) : (
    homeContent
  );
  const sessionContent = sessionManager ? (
    <SessionManagerProvider manager={sessionManager}>{content}</SessionManagerProvider>
  ) : (
    content
  );
  return (
    <GatewayContext.Provider value={runtimeServices ?? null}>
      <QueryClientProvider client={client}>
        <ShellRepositoryProvider repository={repository}>
          {tripRepository ? (
            <TripRepositoryProvider repository={tripRepository}>
              {sessionContent}
            </TripRepositoryProvider>
          ) : (
            sessionContent
          )}
        </ShellRepositoryProvider>
      </QueryClientProvider>
    </GatewayContext.Provider>
  );
}
