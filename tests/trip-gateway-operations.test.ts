import { describe, expect, it, vi } from 'vitest';
import type { GatewayHttpClient, GatewayRead } from '../src/infrastructure/http/http-client';
import { createGatewayTripRepository } from '../src/infrastructure/repositories/trip.gateway-repository';

const tripId = '11111111-1111-4111-8111-111111111111';
const memberId = '22222222-2222-4222-8222-222222222222';
const operationId = '33333333-3333-4333-8333-333333333333';

function trip(coverAvailable: boolean) {
  return {
    id: tripId,
    name: 'Trip',
    description: null,
    public_description: null,
    start_at: '2026-11-01T00:00:00Z',
    end_at: '2026-11-03T00:00:00Z',
    timezone: 'Asia/Ho_Chi_Minh',
    lifecycle: 'UPCOMING',
    archived_at: null,
    plan_edit_policy: 'OWNER_ONLY',
    plan_version: 1,
    membership_revision: 1,
    export_revision: 1,
    cover_image_available: coverAvailable,
    current_membership: {
      id: memberId,
      trip_id: tripId,
      user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      role: 'OWNER',
      joined_at: '2026-10-01T00:00:00Z',
      left_at: null,
    },
    permissions: { can_read: true, can_update: true },
  };
}

function response(data: unknown, status = 200): GatewayRead {
  return { status, data, correlationId: 'trip-operations-test' };
}

function setup() {
  const client = {
    read: vi.fn<GatewayHttpClient['read']>(),
    write: vi.fn<GatewayHttpClient['write']>(),
  };
  return {
    client,
    repository: createGatewayTripRepository(undefined, undefined, client),
  };
}

describe('Trip Gateway operations', () => {
  it('uploads, reads, and removes the private cover using the documented contract', async () => {
    const { client, repository } = setup();
    client.write
      .mockResolvedValueOnce(response(trip(true)))
      .mockResolvedValueOnce(response(trip(false)));
    client.read.mockResolvedValueOnce({
      status: 200,
      data: new Uint8Array([0xff, 0xd8, 0xff]).buffer,
      correlationId: 'cover-read',
      contentType: 'image/jpeg',
    });
    const file = new File(['jpeg'], 'cover.jpg', { type: 'image/jpeg' });
    const signal = new AbortController().signal;

    expect(
      await repository.uploadCover!({ tripId, file, signal }),
    ).toMatchObject({ id: tripId, presentation: { coverAvailable: true } });
    expect(
      await repository.getCover!({ tripId, signal }),
    ).toMatchObject({ type: 'image/jpeg', size: 3 });
    expect(
      await repository.removeCover!({ tripId, signal }),
    ).toMatchObject({ id: tripId, presentation: { coverAvailable: false } });

    expect(client.write.mock.calls[0]).toMatchObject([
      `/api/v1/trips/${tripId}/cover`,
      { method: 'POST', includeCredentials: true },
    ]);
    expect(client.write.mock.calls[0]?.[1].body).toBeInstanceOf(FormData);
    expect(client.write.mock.calls[1]).toMatchObject([
      `/api/v1/trips/${tripId}/cover`,
      { method: 'DELETE', includeCredentials: true },
    ]);
    expect(client.read).toHaveBeenCalledWith(`/api/v1/trips/${tripId}/cover`, {
      responseType: 'bytes',
      signal,
      includeCredentials: true,
    });
  });

  it.each([
    ['ARCHIVE', `/api/v1/trips/${tripId}/archive`, 'POST'],
    ['REOPEN', `/api/v1/trips/${tripId}/reopen`, 'POST'],
    ['DELETE', `/api/v1/trips/${tripId}`, 'DELETE'],
    ['TRANSFER', `/api/v1/trips/${tripId}/ownership`, 'POST'],
  ] as const)('sends the versioned %s lifecycle command', async (action, path, method) => {
    const { client, repository } = setup();
    const transfer = action === 'TRANSFER';
    client.write.mockResolvedValueOnce(
      response({
        id: tripId,
        action,
        plan_version: 4,
        membership_revision: 5,
        export_revision: 6,
        ...(transfer ? { new_owner_user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' } : {}),
        ...(action === 'DELETE' ? { deleted: true } : {}),
      }),
    );
    const request = {
      tripId,
      action,
      reason: 'Confirmed by the owner',
      ...(transfer ? { newOwnerMemberId: memberId } : {}),
      expectedPlanVersion: 3,
      expectedMembershipRevision: 4,
      expectedExportRevision: 5,
      idempotencyKey: operationId,
      signal: new AbortController().signal,
    };

    expect(await repository.manageTrip!(request)).toEqual({ action, planVersion: 4 });
    expect(client.write).toHaveBeenCalledWith(path, {
      method,
      body: {
        reason: request.reason,
        expected_plan_version: 3,
        expected_membership_revision: 4,
        expected_export_revision: 5,
        ...(transfer ? { new_owner_member_id: memberId } : {}),
      },
      idempotencyKey: operationId,
      signal: request.signal,
      includeCredentials: true,
    });
  });

  it('lists, creates, and cancels only scoped personal reminders', async () => {
    const { client, repository } = setup();
    const reminder = {
      id: operationId,
      trip_id: tripId,
      source_type: 'ACTIVITY',
      source_id: memberId,
      remind_at: '2026-10-31T08:00:00Z',
      source_at: '2026-11-01T08:00:00Z',
      status: 'PENDING',
      created_at: '2026-10-30T08:00:00Z',
    };
    client.read.mockResolvedValueOnce(response([reminder]));
    client.write
      .mockResolvedValueOnce(response(reminder, 201))
      .mockResolvedValueOnce(response({ ...reminder, status: 'CANCELLED' }));
    const signal = new AbortController().signal;
    const idempotencyKey = '44444444-4444-4444-8444-444444444444';

    expect(await repository.listReminders!({ tripId, signal })).toEqual([reminder]);
    expect(
      await repository.createReminder!({
        tripId,
        sourceType: 'ACTIVITY',
        sourceId: memberId,
        remindAt: reminder.remind_at,
        idempotencyKey,
        signal,
      }),
    ).toEqual(reminder);
    expect(
      await repository.cancelReminder!({ tripId, reminderId: operationId, signal }),
    ).toMatchObject({ id: operationId, status: 'CANCELLED' });

    expect(client.read).toHaveBeenCalledWith(`/api/v1/trips/${tripId}/reminders`, {
      signal,
      includeCredentials: true,
    });
    expect(client.write.mock.calls[0]).toMatchObject([
      `/api/v1/trips/${tripId}/reminders`,
      {
        method: 'POST',
        body: {
          source_type: 'ACTIVITY',
          source_id: memberId,
          remind_at: reminder.remind_at,
        },
        idempotencyKey,
        includeCredentials: true,
      },
    ]);
    expect(client.write.mock.calls[1]).toMatchObject([
      `/api/v1/trips/${tripId}/reminders/${operationId}`,
      { method: 'DELETE', includeCredentials: true },
    ]);
  });

  it('downloads and validates the private Plan PDF', async () => {
    const { client, repository } = setup();
    const bytes = Uint8Array.from(new TextEncoder().encode('%PDF-1.7\n')).buffer as ArrayBuffer;
    client.read.mockResolvedValueOnce({
      status: 200,
      data: bytes,
      correlationId: 'plan-pdf',
      contentType: 'application/pdf',
    });
    const signal = new AbortController().signal;

    expect(await repository.planPdf!({ tripId, signal })).toMatchObject({
      type: 'application/pdf',
      size: bytes.byteLength,
    });
    expect(client.read).toHaveBeenCalledWith(`/api/v1/trips/${tripId}/plan.pdf`, {
      responseType: 'bytes',
      signal,
      includeCredentials: true,
    });
  });
});
