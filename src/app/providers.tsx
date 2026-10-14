import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ShellRepository } from '../features/shell/repositories/shell.repository';
import { createQueryClient } from './query-client';
import { ShellRepositoryProvider } from '../features/shell/repositories/repository-context';

export function Providers({
  repository,
  children,
}: {
  repository: ShellRepository;
  children: ReactNode;
}) {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <ShellRepositoryProvider repository={repository}>{children}</ShellRepositoryProvider>
    </QueryClientProvider>
  );
}
