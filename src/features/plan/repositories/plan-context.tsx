import { createContext, useContext, type ReactNode } from 'react';
import type { PlanRepository } from '../model/plan';
const Context = createContext<PlanRepository | null>(null);
export function PlanRepositoryProvider({
  repository,
  children,
}: {
  repository: PlanRepository;
  children: ReactNode;
}) {
  return <Context.Provider value={repository}>{children}</Context.Provider>;
}
export function usePlanRepository() {
  const repo = useContext(Context);
  if (!repo) throw Error('Plan repository provider missing');
  return repo;
}
