import type { ReadResult, ShellScenario, ShellSnapshot } from '../model/shell';

export interface ShellReadRequest {
  tripId: string | null;
  scenario: ShellScenario;
  signal: AbortSignal;
}

export interface ShellRepository {
  read(request: ShellReadRequest): Promise<ReadResult<ShellSnapshot>>;
}
