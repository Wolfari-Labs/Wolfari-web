import { useOutletContext } from 'react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RouteContext } from './route-context';
import { useTripList } from '../features/trips/hooks/use-trip-list';
import { tripDateLabel } from '../features/trips/model/trip-list-query';
import { HomePage } from '../features/home/HomePage';
import { homeScenarios, type HomeScenario, type HomeViewModel } from '../features/home/model/home';
import { useHomeRepository } from '../features/home/repositories/home-context';
import { Select } from '../shared/components/Select';
export function HomeRoute() {
  const { viewer, previewEnabled } = useOutletContext<RouteContext>();
  const repository = useHomeRepository();
  const [scenario, setScenario] = useState<HomeScenario>('success');
  const landingQuery = useQuery({
    queryKey: ['home', 'landing', scenario],
    queryFn: ({ signal }) => repository.readLanding({ scenario, signal }),
  });
  const landing: HomeViewModel['landing'] = landingQuery.isPending
    ? { status: 'loading' }
    : landingQuery.isError
      ? {
          status: 'error',
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true },
        }
      : (landingQuery.data ?? { status: 'empty' });
  const query = useTripList('success', !!viewer);
  const result = query.data;
  const item =
    result?.status === 'ready'
      ? result.data.items.find(
          (trip) =>
            trip.permissions.canRead &&
            trip.currentMembership.leftAt === null &&
            trip.lifecycle === 'UPCOMING',
        )
      : null;
  const featured: HomeViewModel['featured'] = !viewer
    ? { status: 'empty' }
    : query.isPending
      ? { status: 'loading' }
      : query.isError
        ? {
            status: 'error',
            error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true },
          }
        : result?.status === 'error'
          ? result
          : item
            ? {
                status: 'ready',
                data: {
                  id: item.id,
                  name: item.name,
                  dates: tripDateLabel(item),
                  memberCount: item.presentation.memberCount,
                  cover: item.presentation.cover,
                  planVersion: item.planVersion,
                  membershipRevision: item.membershipRevision,
                  exportRevision: item.exportRevision,
                  permissions: item.permissions,
                },
              }
            : { status: 'empty' };
  return (
    <>
      <HomePage
        model={{ viewerName: viewer?.fullName ?? null, featured, landing }}
        onRetry={() => {
          if (viewer) void query.refetch();
          void landingQuery.refetch();
        }}
      />
      {previewEnabled && (
        <details className="preview" data-preview="home">
          <summary>Home preview · Dữ liệu minh họa</summary>
          <Select
            label="Trạng thái trang chủ"
            value={scenario}
            onChange={(e) => {
              const next = homeScenarios.find((s) => s === e.target.value);
              if (next) setScenario(next);
            }}
          >
            {homeScenarios.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </details>
      )}
    </>
  );
}
