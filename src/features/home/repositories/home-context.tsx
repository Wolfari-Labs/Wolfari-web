import { createContext, useContext, type ReactNode } from 'react';
import type { HomeRepository } from '../model/home';
const Context = createContext<HomeRepository | null>(null);
export function HomeRepositoryProvider({
  repository,
  children,
}: {
  repository: HomeRepository;
  children: ReactNode;
}) {
  return <Context.Provider value={repository}>{children}</Context.Provider>;
}
export function useHomeRepository() {
  const repository = useContext(Context);
  if (!repository) throw new Error('Home repository provider missing');
  return repository;
}
