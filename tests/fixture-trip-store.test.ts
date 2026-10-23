import { describe, expect, it } from 'vitest';
import { createFixtureTripStore } from '../src/infrastructure/fixtures/trip-store';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { createFixtureShellRepository } from '../src/infrastructure/fixtures/shell.fixture-repository';
import { fixtureTripCatalog, previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

describe('shared fixture Trip store', () => {
  it('exposes metadata revisions consistently without changing the plan version', async () => {
    const store = createFixtureTripStore();
    const trips = createFixtureTripRepository({ store });
    const plans = createFixturePlanRepository({ store });
    const shell = createFixtureShellRepository({ store });
    const request = {
      tripId: previewTripId,
      scenario: 'success' as const,
      signal: new AbortController().signal,
    };
    const before = await trips.getTrip(request);
    if (before.status !== 'ready') throw new Error('Missing fixture');
    const intent = {
      name: 'Updated shared trip',
      description: 'Updated description',
      expectedPlanVersion: before.data.planVersion,
      expectedExportRevision: before.data.exportRevision,
      idempotencyKey: 'metadata-update',
    };
    const updated = await trips.updateTrip({ ...request, intent });
    expect(updated.status).toBe('updated');
    expect(await trips.updateTrip({ ...request, intent })).toEqual(updated);
    const revisions = {
      planVersion: before.data.planVersion,
      exportRevision: before.data.exportRevision + 1,
    };
    expect(await trips.getTrip(request)).toMatchObject({
      status: 'ready',
      data: { ...revisions, name: intent.name, description: intent.description },
    });
    expect(await plans.getPlan(request)).toMatchObject({ status: 'ready', data: revisions });
    expect(await shell.read(request)).toMatchObject({ status: 'ready', data: { trip: revisions } });
    expect(await trips.listTrips(request)).toMatchObject({
      status: 'ready',
      data: {
        items: expect.arrayContaining([
          expect.objectContaining({ id: previewTripId, ...revisions, name: intent.name }),
        ]),
      },
    });
    expect(
      await trips.updateTrip({
        ...request,
        intent: {
          ...intent,
          expectedExportRevision: revisions.exportRevision,
          idempotencyKey: 'no-op',
        },
      }),
    ).toMatchObject({ status: 'updated', trip: revisions });
    expect(await plans.getPlan(request)).toMatchObject({ status: 'ready', data: revisions });
  });

  it('isolates stores, seeds and returned snapshots', () => {
    const seed = structuredClone(fixtureTripCatalog);
    const first = createFixtureTripStore(seed);
    const second = createFixtureTripStore(seed);
    const snapshot = first.readTrips();
    const trip = snapshot.find((item) => item.id === previewTripId)!;
    first.saveTrip({ ...trip, name: 'Changed' }, 'Description');
    expect(second.readTrips()).toEqual(seed);
    expect(snapshot).toEqual(seed);
    const output = first.readTrips();
    Object.assign(output[0]!, { name: 'Mutated consumer' });
    expect(first.readTrips()[0]!.name).not.toBe('Mutated consumer');
    expect(fixtureTripCatalog).toEqual(seed);
  });
});
