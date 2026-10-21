import { createContext, useContext, type ReactNode } from 'react';
import type { FundRepository } from '../model/fund';

const Context = createContext<FundRepository | null>(null);

export function FundRepositoryProvider({
  repository,
  children,
}: {
  repository: FundRepository;
  children: ReactNode;
}) {
  return <Context.Provider value={repository}>{children}</Context.Provider>;
}

export function useFundRepository(): FundRepository {
  const repository = useContext(Context);
  if (!repository) throw Error('Fund repository provider missing');
  return repository;
}
