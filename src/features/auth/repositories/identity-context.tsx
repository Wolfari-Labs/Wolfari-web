import { createContext, useContext, type ReactNode } from 'react';
import type { IdentityRepository } from '../model/identity';
const Context = createContext<IdentityRepository | null>(null);
export function IdentityRepositoryProvider({
  repository,
  children,
}: {
  repository: IdentityRepository;
  children: ReactNode;
}) {
  return <Context.Provider value={repository}>{children}</Context.Provider>;
}
export function useIdentityRepository() {
  const repository = useContext(Context);
  if (!repository) throw new Error('Identity repository provider missing');
  return repository;
}
