import { createContext, useContext, type ReactNode } from 'react';
import type { PriceWatchRepository } from '../model/price-watch';

const Context = createContext<PriceWatchRepository | null>(null);

export function PriceWatchRepositoryProvider({
  repository,
  children,
}: {
  repository: PriceWatchRepository;
  children: ReactNode;
}) {
  return <Context.Provider value={repository}>{children}</Context.Provider>;
}

export function usePriceWatchRepository(): PriceWatchRepository {
  const repository = useContext(Context);
  if (!repository) throw Error('Price watch repository provider missing');
  return repository;
}
