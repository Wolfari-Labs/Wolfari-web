import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useMatches, Outlet } from 'react-router';
import {
  scenarios,
  type ShellScenario,
  type ShellSection,
  type AdminSection,
} from '../features/shell/model/shell';
import { useShell } from '../features/shell/hooks/use-shell';
import { AppShell } from '../features/shell/components/AppShell';
import { ContentState } from '../shared/components/ContentState';
import { Select } from '../shared/components/Select';
import { adminSections } from '../features/shell/components/AdminChrome';
import { paths } from './route-paths';

export function App({ previewTripPath }: { previewTripPath: string | null }) {
  const { tripId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const matches = useMatches();
  const handle = matches.at(-1)?.handle as { title?: string; notFound?: boolean } | undefined;
  const adminLayout = pathname === paths.admin;
  const [adminSection, setAdminSection] = useState<AdminSection>('overview');
  const [scenario, setScenario] = useState<ShellScenario>('success');
  const [section, setSection] = useState<ShellSection>('overview');
  const query = useShell(tripId ?? null, scenario);
  const result = query.data;
  const snapshot = result?.status === 'ready' ? result.data : null;
  const effectiveSection = pathname.endsWith('/plan')
    ? 'plan'
    : pathname.endsWith('/members')
      ? 'members'
      : section;
  const title = adminLayout
    ? adminSections.find((item) => item.id === adminSection)?.label
    : tripId
      ? {
          overview: 'Tổng quan chuyến đi',
          plan: 'Lịch trình',
          members: 'Thành viên',
          map: 'Bản đồ địa điểm',
          dress: 'Dress code',
          packing: 'Packing list',
          fund: 'Quỹ nhóm',
          fare: 'Theo dõi giá vé',
          settings: 'Cài đặt',
          tools: 'Tiện ích',
        }[effectiveSection]
      : (handle?.title ?? 'Không gian làm việc');
  const previousNavigation = useRef([pathname, section, adminSection]);
  useEffect(() => {
    if (
      previousNavigation.current.some(
        (value, index) => value !== [pathname, section, adminSection][index],
      )
    ) {
      const main = document.getElementById('main-content');
      if (main) {
        main.scrollTop = 0;
        main.focus({ preventScroll: true });
      }
      if (typeof window.matchMedia === 'function')
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    previousNavigation.current = [pathname, section, adminSection];
  }, [pathname, section, adminSection]);
  const denied =
    result?.status === 'ready' &&
    (adminLayout
      ? snapshot?.viewer?.systemRole !== 'ADMIN'
      : tripId
        ? snapshot?.trip?.permissions.canRead !== true
        : [paths.trips, paths.profile].includes(pathname) && !snapshot?.viewer);
  return (
    <AppShell
      snapshot={snapshot}
      adminLayout={adminLayout}
      adminSection={adminSection}
      onAdminSectionChange={setAdminSection}
      tripLayout={!!tripId}
      currentPath={pathname}
      section={effectiveSection}
      onSectionChange={(next) => {
        setSection(next === 'plan' || next === 'members' ? 'overview' : next);
        if (tripId) {
          navigate(
            next === 'plan'
              ? paths.plan(tripId)
              : next === 'members'
                ? paths.members(tripId)
                : paths.trip(tripId),
          );
        }
      }}
    >
      {!handle?.notFound && <h1 className="screen-title">{title}</h1>}
      {previewTripPath && (
        <details className="preview">
          <summary>UI preview · Dữ liệu minh họa</summary>
          <div className="preview-controls">
            <Link to={paths.home}>Shell trang chủ</Link>
            <Link to={previewTripPath}>Shell chuyến đi</Link>
            <Link to={paths.admin}>Shell Admin</Link>
            <a href="/design-system.html">Shared UI foundation</a>
            <Select
              label="Trạng thái"
              aria-label="Trạng thái preview"
              value={scenario}
              onChange={(event) => {
                const next = scenarios.find((item) => item === event.target.value);
                if (next) setScenario(next);
              }}
            >
              {scenarios.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
        </details>
      )}
      {handle?.notFound ? (
        <Outlet />
      ) : query.isPending ? (
        <ContentState state="loading" headingLevel={2} />
      ) : query.isError ? (
        <ContentState
          state="error"
          headingLevel={2}
          error={{ code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true }}
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : result?.status === 'error' ? (
        <ContentState
          state={
            result.error.code === 'SERVICE_UNAVAILABLE' && !result.error.retryable
              ? 'unavailable'
              : 'error'
          }
          headingLevel={2}
          error={result.error}
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : result?.status === 'empty' ? (
        <ContentState state="empty" headingLevel={2} />
      ) : denied ? (
        <ContentState
          state="error"
          headingLevel={2}
          error={{ code: 'PERMISSION_DENIED', correlationId: null, retryable: false }}
        />
      ) : (
        <Outlet />
      )}
    </AppShell>
  );
}
