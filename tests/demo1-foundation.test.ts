import { describe, expect, it } from 'vitest';
import { createGatewayHttpClient } from '../src/infrastructure/http/http-client';
import { parseEnvelope } from '../src/infrastructure/http/envelope';
import { tripCalendarDays, validCalendarDate } from '../src/shared/lib/calendar';
import { localTimeToIso } from '../src/features/plan/model/plan-draft';
import { activitiesForDay } from '../src/features/plan/model/plan-presentation';
import type { ActivityViewModel } from '../src/features/plan/model/plan';

describe('demo1 transport and calendar', () => {
  it.each([200, 201, 202])(
    'preserves status %i and validated mutation revision',
    async (status) => {
      const transport: typeof fetch = async () =>
        new Response(
          JSON.stringify({
            data: { value: 1 },
            meta: { correlation_id: 'test', export_revision: 7 },
          }),
          { status },
        );
      const response = await createGatewayHttpClient({ transport }).write('/api/v1/trips', {
        method: 'POST',
        body: {},
      });
      expect(response).toEqual({
        data: { value: 1 },
        status,
        correlationId: 'test',
        metadata: { exportRevision: 7 },
      });
    },
  );
  it.each([0, -1, '7', 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid revision %s',
    (revision) => {
      expect(() => parseEnvelope({ data: {}, meta: { export_revision: revision } })).toThrow();
    },
  );
  it('keeps a three-day Trip at three days with exclusive midnight', () => {
    expect(
      tripCalendarDays(
        '2026-11-01T00:00:00+07:00',
        '2026-11-04T00:00:00+07:00',
        'Asia/Ho_Chi_Minh',
      ),
    ).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
  });
  it('includes a partial final day across a year boundary', () => {
    expect(
      tripCalendarDays(
        '2026-12-31T23:00:00+07:00',
        '2027-01-01T01:00:00+07:00',
        'Asia/Ho_Chi_Minh',
      ),
    ).toEqual(['2026-12-31', '2027-01-01']);
  });
  it('supports one day and another timezone without fixed +07', () => {
    const start = localTimeToIso('2026-11-01', '00:00', 'Asia/Tokyo');
    const end = localTimeToIso('2026-11-02', '00:00', 'Asia/Tokyo');
    expect(start).toBe('2026-10-31T15:00:00.000Z');
    expect(tripCalendarDays(start, end, 'Asia/Tokyo')).toEqual(['2026-11-01']);
  });
  it('rejects invalid calendar dates and nonexistent local times', () => {
    expect(validCalendarDate('2028-02-29')).toBe(true);
    expect(validCalendarDate('2026-02-29')).toBe(false);
    expect(() => localTimeToIso('2026-03-08', '02:30', 'America/New_York')).toThrow();
  });
  it('groups day-only without a fabricated timestamp', () => {
    const a = {
      id: 'a',
      position: 0,
      startsAt: null,
      endsAt: null,
      scheduledDate: '2026-11-01',
    } as ActivityViewModel;
    expect(activitiesForDay([a], '2026-11-01', 'Asia/Ho_Chi_Minh')).toEqual([a]);
    expect(activitiesForDay([a], '2026-11-02', 'Asia/Ho_Chi_Minh')).toEqual([]);
  });
});
