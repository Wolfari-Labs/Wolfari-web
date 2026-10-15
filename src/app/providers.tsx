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

export function Providers({
  repository,
  tripRepository,
  identityRepository,
  homeRepository,
  children,
}: {
  repository: ShellRepository;
  tripRepository?: TripRepository;
  identityRepository?: IdentityRepository;
  homeRepository?: HomeRepository;
  children: ReactNode;
}) {
  const [client] = useState(createQueryClient);
  const homeContent = homeRepository ? (
    <HomeRepositoryProvider repository={homeRepository}>{children}</HomeRepositoryProvider>
  ) : (
    children
  );
  const content = identityRepository ? (
    <IdentityRepositoryProvider repository={identityRepository}>
      {homeContent}
    </IdentityRepositoryProvider>
  ) : (
    homeContent
  );
  return (
    <QueryClientProvider client={client}>
      <ShellRepositoryProvider repository={repository}>
        {tripRepository ? (
          <TripRepositoryProvider repository={tripRepository}>{content}</TripRepositoryProvider>
        ) : (
          content
        )}
      </ShellRepositoryProvider>
    </QueryClientProvider>
  );
}
