import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ShellRepository } from '../features/shell/repositories/shell.repository';
import { createQueryClient } from './query-client';
import { ShellRepositoryProvider } from '../features/shell/repositories/repository-context';
import type { TripRepository } from '../features/trips/repositories/trip.repository';
import { TripRepositoryProvider } from '../features/trips/repositories/repository-context';

export function Providers({
  repository,
  tripRepository,
  children,
}: {
  repository: ShellRepository;
  tripRepository?: TripRepository;
  children: ReactNode;
}) {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <ShellRepositoryProvider repository={repository}>
        {tripRepository ? (
          <TripRepositoryProvider repository={tripRepository}>{children}</TripRepositoryProvider>
        ) : (
          children
        )}
      </ShellRepositoryProvider>
    </QueryClientProvider>
  );
}
