import { createContext, useContext, type ReactNode } from 'react';
import type { MembershipRepository, InvitationRepository } from '../model/members';
const Context = createContext<{
  membership: MembershipRepository;
  invitation: InvitationRepository;
} | null>(null);
export function MembersRepositoryProvider({
  membership,
  invitation,
  children,
}: {
  membership: MembershipRepository;
  invitation: InvitationRepository;
  children: ReactNode;
}) {
  return <Context.Provider value={{ membership, invitation }}>{children}</Context.Provider>;
}
export function useMembersRepositories() {
  const value = useContext(Context);
  if (!value) throw Error('Members repository provider missing');
  return value;
}
