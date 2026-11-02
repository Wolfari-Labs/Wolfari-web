export interface VolumeMetadata {
  Name?: string;
  Labels?: Record<string, string> | null;
}

export function verifyOwnedVolumes(
  owner: { project: string; runId: string; label: string },
  existingNames: readonly string[],
  inspect: (name: string) => VolumeMetadata | undefined,
): void;
