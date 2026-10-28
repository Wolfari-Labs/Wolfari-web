import { Link, useOutletContext } from 'react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RouteContext } from './route-context';
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
    enabled: previewEnabled,
  });
  const landing: HomeViewModel['landing'] = landingQuery.isPending
    ? { status: 'loading' }
    : landingQuery.isError
      ? {
          status: 'error',
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true },
        }
      : (landingQuery.data ?? { status: 'empty' });
  return (
    <>
      {!previewEnabled && (
        <section>
          <h1>{viewer ? `Chào ${viewer.fullName}` : 'Cùng lên kế hoạch với Wolfari'}</h1>
          <p>Lịch trình cộng tác và quỹ đóng góp thủ công cho chuyến đi của bạn.</p>
          <Link to={viewer ? '/trips' : '/login'}>
            {viewer ? 'Chuyến đi của tôi' : 'Đăng nhập'}
          </Link>
          {viewer ? (
            <p>
              <Link to="/trips/new">Tạo chuyến đi</Link>
            </p>
          ) : (
            <p>
              <Link to="/register">Tạo tài khoản</Link>
            </p>
          )}
        </section>
      )}
      {previewEnabled && (
        <>
          <HomePage
            model={{ viewerName: viewer?.fullName ?? null, landing }}
            onRetry={() => {
              void landingQuery.refetch();
            }}
          />
        </>
      )}
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
