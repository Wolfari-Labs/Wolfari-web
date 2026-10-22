import { describe, expect, it, vi } from 'vitest';
import { createGatewayHttpClient } from '../src/infrastructure/http/http-client';
import { createGatewayTripRepository } from '../src/infrastructure/repositories/trip.gateway-repository';

const tripId = '11111111-1111-4111-8111-111111111111';
const idempotencyKey = '22222222-2222-4222-8222-222222222222';
const request = {
  tripId,
  policy: 'OWNER_ONLY' as const,
  editorMemberIds: ['must-not-be-sent'],
  expectedMembershipRevision: 7,
  idempotencyKey,
  signal: new AbortController().signal,
};

function policyResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({ data, meta: { correlation_id: 'policy-correlation' } }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

function policyFailure(status: number, code: string) {
  return new Response(
    JSON.stringify({
      error: { code, message: 'Policy write failed', retryable: status >= 500, details: { revision: 7 } },
      meta: { correlation_id: 'policy-error' },
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

describe('Gateway plan policy command', () => {
  it.each(['OWNER_ONLY', 'ALL_MEMBERS'] as const)(
    'sends %s with the revision, stable idempotency key and no editor IDs',
    async (policy) => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      policyResponse({
        policy,
        editor_member_ids: [],
        membership_revision: 8,
      }),
    );
    const repository = createGatewayTripRepository(
      undefined,
      undefined,
      createGatewayHttpClient({ transport }),
    );
    const result = await repository.updatePlanPolicy!({ ...request, policy });
    const [url, init] = transport.mock.calls[0]!;

    expect(url).toBe(`/api/v1/trips/${tripId}/plan-policy`);
    expect(init?.method).toBe('PUT');
    expect(init?.credentials).toBe('include');
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBe(idempotencyKey);
    expect(new Headers(init?.headers).get('X-Client-Type')).toBe('web');
    expect(new Headers(init?.headers).get('X-Correlation-Id')).toBeTruthy();
    expect(JSON.parse(String(init?.body))).toEqual({
      policy,
      editor_member_ids: [],
      expected_membership_revision: 7,
    });
    expect(result).toMatchObject({
      status: 'updated',
      data: { policy, editorMemberIds: [], membershipRevision: 8 },
      correlationId: 'policy-correlation',
    });
    },
  );

  it('fails closed on malformed 2xx policy projections as an unknown write outcome', async () => {
    for (const data of [
      { policy: 'UNRECOGNIZED', editor_member_ids: [], membership_revision: 8 },
      { policy: 'OWNER_ONLY', editor_member_ids: 'member', membership_revision: 8 },
      { policy: 'OWNER_ONLY', editor_member_ids: [], membership_revision: 0 },
      { policy: 'OWNER_ONLY', editor_member_ids: ['duplicate', 'duplicate'], membership_revision: 8 },
    ]) {
      const transport = vi.fn<typeof fetch>().mockResolvedValue(policyResponse(data));
      const result = await createGatewayTripRepository(
        undefined,
        undefined,
        createGatewayHttpClient({ transport }),
      ).updatePlanPolicy!(request);
      expect(result).toMatchObject({
        status: 'unknown',
        error: { code: 'SERVICE_UNAVAILABLE', correlationId: 'policy-correlation' },
      });
    }
  });

  it('classifies timeout/network and server failures as unknown, without retrying', async () => {
    for (const transport of [
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline')),
      vi.fn<typeof fetch>().mockResolvedValue(policyFailure(503, 'SERVICE_UNAVAILABLE')),
    ]) {
      const result = await createGatewayTripRepository(
        undefined,
        undefined,
        createGatewayHttpClient({ transport }),
      ).updatePlanPolicy!(request);
      expect(result.status).toBe('unknown');
      expect(transport).toHaveBeenCalledTimes(1);
    }
  });

  it('returns a definite conflict while preserving server error metadata', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      policyFailure(409, 'STATE_CONFLICT'),
    );
    const result = await createGatewayTripRepository(
      undefined,
      undefined,
      createGatewayHttpClient({ transport }),
    ).updatePlanPolicy!(request);
    expect(result).toMatchObject({
      status: 'error',
      error: { code: 'STATE_CONFLICT', correlationId: 'policy-error', details: { revision: 7 } },
    });
  });

  it.each([
    [400, 'VALIDATION_FAILED'],
    [401, 'UNAUTHENTICATED'],
    [403, 'PERMISSION_DENIED'],
    [404, 'RESOURCE_NOT_FOUND'],
  ])('classifies definite Gateway %i responses as errors', async (status, code) => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(policyFailure(status, code));
    const result = await createGatewayTripRepository(
      undefined,
      undefined,
      createGatewayHttpClient({ transport }),
    ).updatePlanPolicy!(request);
    expect(result).toMatchObject({
      status: 'error',
      error: { code, correlationId: 'policy-error' },
    });
  });

  it('rejects a cancelled command before issuing a write', async () => {
    const transport = vi.fn<typeof fetch>();
    const controller = new AbortController();
    controller.abort();
    const result = createGatewayTripRepository(
      undefined,
      undefined,
      createGatewayHttpClient({ transport }),
    ).updatePlanPolicy!({ ...request, signal: controller.signal });
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(transport).not.toHaveBeenCalled();
  });
});
