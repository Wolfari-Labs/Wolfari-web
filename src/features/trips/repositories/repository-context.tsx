import { createContext, useContext, type ReactNode } from 'react';
import type { TripRepository } from './trip.repository';

const Context = createContext<TripRepository | null>(null);

export function TripRepositoryProvider({
  repository,
  children,
}: {
  repository: TripRepository;
  children: ReactNode;
}) {
  return <Context.Provider value={repository}>{children}</Context.Provider>;
}

export function useTripRepository() {
  const repository = useContext(Context);
  if (!repository) throw new Error('Trip repository provider is missing');
  return repository;
}
