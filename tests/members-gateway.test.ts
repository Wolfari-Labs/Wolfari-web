import { describe, expect, it, vi } from 'vitest';
import { createGatewayHttpClient } from '../src/infrastructure/http/http-client';
import { createGatewayMembershipRepository } from '../src/infrastructure/repositories/membership.gateway-repository';

const tripId = '11111111-1111-4111-8111-111111111111';
const membership = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  trip_id: tripId,
  user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  role: 'MEMBER',
  joined_at: '2026-10-01T00:00:00Z',
  left_at: null,
};

function response(data: unknown, status = 200, correlationId = 'members-correlation') {
  return new Response(
    JSON.stringify({ data, meta: { correlation_id: correlationId } }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

function failure(status: number, code: string) {
  return new Response(
    JSON.stringify({
      error: { code, message: 'Read failed', retryable: status === 503, details: { reason: code } },
      meta: { correlation_id: 'members-error' },
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

describe('Gateway membership repository', () => {
  it('preserves opaque cursors, includes requested history and maps IDs without inferred identity', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      response({ items: [membership], next_cursor: 'page/+==' }),
    );
    const repository = createGatewayMembershipRepository(
      undefined,
      createGatewayHttpClient({ transport }),
    );
    const result = await repository.listMembers({
      tripId,
      scenario: 'success',
      signal: new AbortController().signal,
      cursor: 'previous/+==',
      limit: 100,
      includeLeft: true,
    });

    const [url, init] = transport.mock.calls[0]!;
    expect(url).toBe(
      `/api/v1/trips/${tripId}/members?limit=100&include_left=true&cursor=previous%2F%2B%3D%3D`,
    );
    expect(init?.method).toBe('GET');
    expect(init?.credentials).toBe('include');
    expect(new Headers(init?.headers).get('X-Client-Type')).toBe('web');
    expect(new Headers(init?.headers).get('Accept')).toBe('application/json');
    expect(new Headers(init?.headers).get('X-Correlation-Id')).toBeTruthy();
    expect(result).toMatchObject({
      status: 'ready',
      data: {
        nextCursor: 'page/+==',
        items: [
          {
            id: membership.id,
            tripId,
            userId: membership.user_id,
            role: 'MEMBER',
            presentation: { displayName: null, avatar: null },
          },
        ],
      },
    });
  });

  it('validates the entire member projection and retains the Gateway correlation ID', async () => {
    const invalidRows = [
      { ...membership, id: undefined },
      { ...membership, id: '' },
      { ...membership, user_id: undefined },
      { ...membership, trip_id: 'foreign-trip' },
      { ...membership, trip_id: undefined },
      { ...membership, role: 'ADMIN' },
      { ...membership, joined_at: 'not-a-date' },
      { ...membership, joined_at: undefined },
      { ...membership, left_at: 'not-a-date' },
      { ...membership, left_at: undefined },
    ];
    for (const item of invalidRows) {
      const transport = vi.fn<typeof fetch>().mockResolvedValue(
        response({ items: [item], next_cursor: null }),
      );
      const result = await createGatewayMembershipRepository(
        undefined,
        createGatewayHttpClient({ transport }),
      ).listMembers({ tripId, scenario: 'success', signal: new AbortController().signal });
      expect(result).toMatchObject({
        status: 'error',
        error: { code: 'SERVICE_UNAVAILABLE', correlationId: 'members-correlation', retryable: false },
      });
    }

    for (const data of [
      { next_cursor: null },
      { items: {}, next_cursor: null },
      { items: [], next_cursor: 42 },
      { items: [], next_cursor: '' },
    ]) {
      const transport = vi.fn<typeof fetch>().mockResolvedValue(response(data));
      const result = await createGatewayMembershipRepository(
        undefined,
        createGatewayHttpClient({ transport }),
      ).listMembers({ tripId, scenario: 'success', signal: new AbortController().signal });
      expect(result).toMatchObject({
        status: 'error',
        error: { correlationId: 'members-correlation', retryable: false },
      });
    }
  });

  it.each([
    [401, 'UNAUTHENTICATED'],
    [403, 'PERMISSION_DENIED'],
    [404, 'RESOURCE_NOT_FOUND'],
    [409, 'VERSION_CONFLICT'],
    [503, 'SERVICE_UNAVAILABLE'],
  ])('preserves Gateway %i errors and correlation metadata', async (status, code) => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(failure(status, code));
    const result = await createGatewayMembershipRepository(
      undefined,
      createGatewayHttpClient({ transport }),
    ).listMembers({ tripId, scenario: 'success', signal: new AbortController().signal });

    expect(result).toMatchObject({
      status: 'error',
      error: { code, correlationId: 'members-error', details: { reason: code } },
    });
  });

  it('honors cancellation before issuing an HTTP request', async () => {
    const transport = vi.fn<typeof fetch>();
    const controller = new AbortController();
    controller.abort();
    const result = createGatewayMembershipRepository(
      undefined,
      createGatewayHttpClient({ transport }),
    ).listMembers({ tripId, scenario: 'success', signal: controller.signal });

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(transport).not.toHaveBeenCalled();
  });
});
