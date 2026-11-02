import { describe, expect, it, vi } from 'vitest';

import { verifyOwnedVolumes } from '../scripts/demo1-ownership.mjs';
const runId = '20261102151232-862e790a';
const project = `wolfari-web-demo1-${runId}`;
const label = 'io.wolfari.demo1.run';
const owner = { project, runId, label };
const name = `${project}_postgres_data`;
const volume = { Name: name, Labels: { [label]: runId, 'com.docker.compose.project': project } };

describe('isolated demo cleanup ownership', () => {
  it('does not inspect absent volumes after a failed image build', () => {
    const inspect = vi.fn();
    verifyOwnedVolumes(owner, [], inspect);
    expect(inspect).not.toHaveBeenCalled();
  });
  it('verifies a partially created stack without touching unrelated volumes', () => {
    const inspect = vi.fn(() => volume);
    verifyOwnedVolumes(owner, [name, 'wolfari-demo_postgres_data'], inspect);
    expect(inspect).toHaveBeenCalledExactlyOnceWith(name);
  });
  it.each([
    { ...volume, Name: 'wolfari-demo_postgres_data' },
    { ...volume, Labels: { ...volume.Labels, [label]: 'another-run' } },
    { ...volume, Labels: { ...volume.Labels, 'com.docker.compose.project': 'wolfari-demo' } },
    { ...volume, Labels: {} },
  ])('refuses an existing volume whose ownership is not exact', (foreign) => {
    expect(() => verifyOwnedVolumes(owner, [name], () => foreign)).toThrow(
      'VOLUME_OWNERSHIP_MISMATCH',
    );
  });
  it('does not suppress daemon or inspect failures', () => {
    expect(() =>
      verifyOwnedVolumes(owner, [name], () => {
        throw Error('DAEMON_UNAVAILABLE');
      }),
    ).toThrow('DAEMON_UNAVAILABLE');
  });
  it('rejects a broad or mismatched project before inspection', () => {
    const inspect = vi.fn();
    expect(() =>
      verifyOwnedVolumes({ ...owner, project: 'wolfari-demo' }, [name], inspect),
    ).toThrow('OWNERSHIP_MISMATCH');
    expect(inspect).not.toHaveBeenCalled();
  });
});
