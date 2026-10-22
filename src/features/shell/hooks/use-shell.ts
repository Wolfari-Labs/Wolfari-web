import { useQuery } from '@tanstack/react-query';
import { useShellRepository } from '../repositories/repository-context';
import type { ShellScenario } from '../model/shell';

export function useShell(tripId: string | null, scenario: ShellScenario, enabled = true) {
  const repository = useShellRepository();
  return useQuery({
    queryKey: ['shell', tripId, scenario],
    queryFn: ({ signal }) => repository.read({ tripId, scenario, signal }),
    enabled,
  });
}
