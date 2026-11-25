import { describe, expect, it, vi } from 'vitest';
import { createGatewayHttpClient } from '../src/infrastructure/http/http-client';
import { createGatewayPlanRepository } from '../src/infrastructure/repositories/plan.gateway-repository';
import { decodePreparationRecommendation } from '../src/infrastructure/repositories/preparation-recommendations.gateway-repository';
import { restorePlanCommand } from '../src/features/plan/model/plan-command-intent';

const tripId = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const itemId = 'a'.repeat(24);
const preview = {
  id,
  trip_id: tripId,
  type: 'PACKING',
  status: 'PREVIEWED',
  rule_version: 'v1',
  base_plan_version: 3,
  applied_plan_version: null,
  created_at: '2026-11-26T00:00:00Z',
  expires_at: '2026-11-26T00:30:00Z',
  can_apply: true,
  items: [
    {
      id: itemId,
      kind: 'PACKING',
      packing_item: { name: 'Áo mưa', quantity: '1', unit: 'cái' },
      reasons: ['Dự báo có mưa.'],
      warnings: [],
      rule_ids: ['PK-RAIN'],
    },
  ],
  warnings: ['WEATHER_UNAVAILABLE'],
  sources: [
    {
      provider: 'OPEN_METEO',
      stale: true,
      is_mock: false,
      attribution: [{ text: 'Open-Meteo', url: 'https://open-meteo.com/' }],
    },
  ],
};
function setup(data: unknown) {
  const transport = vi.fn<typeof fetch>().mockImplementation(
    async () =>
      new Response(JSON.stringify({ data, meta: { correlation_id: 'recommendation' } }), {
        status: 200,
      }),
  );
  return {
    repo: createGatewayPlanRepository(undefined, createGatewayHttpClient({ transport })),
    transport,
  };
}
describe('preparation recommendations Gateway contract', () => {
  it('previews without sending the legacy type, version or nested scope', async () => {
    const { repo, transport } = setup(preview);
    const result = await repo.recommendations!.preview({
      tripId,
      type: 'PACKING',
      date: '2026-11-26',
      signal: new AbortController().signal,
    });
    expect(result.items[0]).toMatchObject({
      title: 'Áo mưa',
      quantity: '1',
      reasons: ['Dự báo có mưa.'],
    });
    expect(result.sources[0]).toMatchObject({
      stale: true,
      isMock: false,
      attribution: [{ text: 'Open-Meteo' }],
    });
    expect(String(transport.mock.calls[0]![0])).toContain(`/trips/${tripId}/recommendations`);
    expect(JSON.parse(String(transport.mock.calls[0]![1]?.body))).toEqual({
      type: 'PACKING',
      date: '2026-11-26',
    });
  });
  it('restores immutable apply intent and accepts duplicate-only success without a version bump', async () => {
    const { repo, transport } = setup({
      ...preview,
      status: 'APPLIED',
      can_apply: false,
      applied_plan_version: 3,
      applied: {
        item_ids: [itemId],
        created: [],
        skipped: [{ item_id: itemId, reason: 'ALREADY_IN_PLAN' }],
      },
    });
    const payload = { kind: 'recommendation-apply', recommendationId: id, itemIds: [itemId] };
    const command = restorePlanCommand(repo, tripId, payload)!;
    payload.itemIds[0] = 'b'.repeat(24);
    expect(
      await command({
        expectedPlanVersion: 3,
        idempotencyKey: 'same-key',
        signal: new AbortController().signal,
      }),
    ).toMatchObject({
      status: 'success',
      data: { appliedPlanVersion: 3, applied: { createdCount: 0, skippedCount: 1 } },
    });
    expect(String(transport.mock.calls[0]![0])).toContain(`/recommendations/${id}/apply`);
    expect(JSON.parse(String(transport.mock.calls[0]![1]?.body))).toEqual({
      item_ids: [itemId],
      expected_plan_version: 3,
    });
    expect(new Headers(transport.mock.calls[0]![1]?.headers).get('Idempotency-Key')).toBe(
      'same-key',
    );
  });
  it.each([
    { trip_id: '33333333-3333-4333-8333-333333333333' },
    { items: [{ ...preview.items[0], id: 'bad-id' }] },
    { items: [preview.items[0], preview.items[0]] },
    {
      sources: [
        { ...preview.sources[0], attribution: [{ text: 'Bad', url: 'javascript:alert(1)' }] },
      ],
    },
    { status: 'APPLIED', applied_plan_version: 2 },
  ])('rejects wrong scope or malformed proposal %j', (patch) => {
    expect(() => decodePreparationRecommendation({ ...preview, ...patch }, tripId)).toThrow();
  });
  it('ignores using the global endpoint without writing any plan items', async () => {
    const { repo, transport } = setup({ ...preview, status: 'REJECTED', can_apply: false });
    expect(
      await repo.recommendations!.ignore({
        tripId,
        recommendationId: id,
        signal: new AbortController().signal,
      }),
    ).toMatchObject({ status: 'REJECTED' });
    expect(String(transport.mock.calls[0]![0])).toContain(`/recommendations/${id}/ignore`);
    expect(JSON.parse(String(transport.mock.calls[0]![1]?.body))).toEqual({});
  });
});
