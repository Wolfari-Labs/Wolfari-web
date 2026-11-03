/** Check only existing volumes; a failed Compose build may have created none. */
export function verifyOwnedVolumes({ project, runId, label }, existingNames, inspect) {
  if (!/^\d{14}-[0-9a-f]{8}$/.test(runId) || project !== `wolfari-web-demo1-${runId}`)
    throw Error('OWNERSHIP_MISMATCH');
  const existing = new Set(existingNames);
  for (const suffix of ['postgres_data', 'rabbitmq_data', 'minio_data']) {
    const name = `${project}_${suffix}`;
    if (!existing.has(name)) continue;
    const volume = inspect(name);
    if (
      volume?.Name !== name ||
      volume.Labels?.[label] !== runId ||
      volume.Labels?.['com.docker.compose.project'] !== project
    )
      throw Error('VOLUME_OWNERSHIP_MISMATCH');
  }
}
