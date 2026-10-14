import { createContext, useContext, type ReactNode } from 'react';
import type { ShellRepository } from './shell.repository';
const Context = createContext<ShellRepository | null>(null);
export function ShellRepositoryProvider({
  repository,
  children,
}: {
  repository: ShellRepository;
  children: ReactNode;
}) {
  return <Context.Provider value={repository}>{children}</Context.Provider>;
}
export function useShellRepository() {
  const repository = useContext(Context);
  if (!repository) throw new Error('Shell repository provider is missing');
  return repository;
}
