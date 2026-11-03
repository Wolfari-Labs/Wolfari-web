import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  captureInvitationToken,
  invitationResponseAttempt,
} from '../features/members/invitation-token';
import { invitationManagementAttempt } from '../features/members/invitation-management-attempt';
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
import { Alert } from '../shared/components/Alert';
import { Button } from '../shared/components/Button';
import type { DemoAccess } from '../features/auth/model/demo-access';
import type { RouteContext } from './route-context';
import { useOptionalSessionManager } from './session-context';
import { safeReturnTo } from './safe-return-to';

const noSessionSubscription = () => () => undefined;
const unknownSession = () => 'unknown';

export function App({
  previewTripPath,
  demoAccess,
}: {
  previewTripPath: string | null;
  demoAccess?: DemoAccess;
}) {
  const { tripId } = useParams();
  const location = useLocation();
  const { pathname, search, hash } = location;
  useLayoutEffect(() => {
    captureInvitationToken();
    const sync = () => captureInvitationToken();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [pathname, search, hash, location.key]);
  const navigate = useNavigate();
  const sessionManager = useOptionalSessionManager();
  const matches = useMatches();
  const handle = matches.at(-1)?.handle as
    | {
        title?: string;
        notFound?: boolean;
        layout?: 'trip-list' | 'admin';
        requiresViewer?: boolean;
        contentTitle?: boolean;
        fullBleed?: boolean;
        section?: ShellSection;
      }
    | undefined;
  // Router matching permits case/trailing-slash aliases. Policies must use the same identity.
  // Keep opaque route params untouched; this canonical path is only for known route policy/chrome.
  const policyPath = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  const adminLayout = handle?.layout === 'admin' || policyPath === paths.admin;
  const listLayout = handle?.layout === 'trip-list' || policyPath === paths.trips;
  const ownContentTitle = listLayout || handle?.contentTitle;
  const requiresViewer =
    handle?.requiresViewer || [paths.trips, paths.profile].includes(policyPath);
  const [adminSection, setAdminSection] = useState<AdminSection>('overview');
  const [scenario, setScenario] = useState<ShellScenario>(() =>
    [paths.home, paths.login, paths.register].includes(policyPath) ? 'guest' : 'success',
  );
  const [demoActive, setDemoActive] = useState(false);
  const sessionStatus = useSyncExternalStore(
    sessionManager?.subscribe ?? noSessionSubscription,
    sessionManager?.status ?? unknownSession,
  );
  const previousSessionStatus = useRef(sessionStatus);
  useEffect(() => {
    if (
      sessionStatus === 'anonymous' ||
      sessionStatus === 'expired' ||
      (sessionStatus === 'unknown' && previousSessionStatus.current === 'authenticated')
    ) {
      invitationResponseAttempt.clear();
      invitationManagementAttempt.clear();
    }
    previousSessionStatus.current = sessionStatus;
  }, [sessionStatus]);
  const privateSessionBlocked =
    !!sessionManager &&
    requiresViewer &&
    (sessionStatus === 'unknown' || sessionStatus === 'anonymous' || sessionStatus === 'expired');
  const standaloneAuthRoute =
    !!sessionManager &&
    [
      paths.login,
      paths.register,
      paths.forgotPassword,
      paths.verifyEmail,
      paths.resetPassword,
      paths.invitations,
      '/invitations/local',
    ].includes(policyPath);
  // This authenticated screen owns its Trip read guard. Keep it mounted after a
  // successful leave: the actor can still poll their operation even though Trip
  // reads now return 404. No Trip data is exposed by bypassing shell chrome.
  const membershipRecoveryRoute = !!sessionManager && handle?.section === 'members';
  const shellQueryEnabled = !privateSessionBlocked && !standaloneAuthRoute;
  const query = useShell(tripId ?? null, scenario, shellQueryEnabled);
  const result = query.data;
  const snapshot =
    sessionManager && sessionStatus !== 'authenticated'
      ? null
      : result?.status === 'ready'
        ? result.data
        : null;
  const effectiveSection = handle?.section ?? 'overview';
  useEffect(() => {
    if (sessionStatus === 'authenticated') setScenario('success');
    if (
      sessionStatus === 'anonymous' &&
      [paths.home, paths.login, paths.register].includes(policyPath)
    )
      setScenario('guest');
  }, [policyPath, sessionStatus]);
  useEffect(() => {
    if (
      (sessionStatus === 'anonymous' || sessionStatus === 'expired') &&
      requiresViewer &&
      policyPath !== paths.login &&
      policyPath !== paths.register
    ) {
      navigate(`${paths.login}?returnTo=${encodeURIComponent(safeReturnTo(pathname + search))}`, {
        replace: true,
      });
      return;
    }
    if (
      result?.status === 'error' &&
      result.error.code === 'UNAUTHENTICATED' &&
      requiresViewer &&
      policyPath !== paths.login &&
      policyPath !== paths.register
    ) {
      navigate(`${paths.login}?returnTo=${encodeURIComponent(safeReturnTo(pathname + search))}`, {
        replace: true,
      });
    }
  }, [navigate, pathname, search, policyPath, requiresViewer, result, sessionStatus]);
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
  useEffect(() => {
    document.title = title ? `${title} · Wolfari` : 'Wolfari';
  }, [title]);
  const previousNavigation = useRef<[string, AdminSection] | null>(null);
  useEffect(() => {
    const firstRenderNeedsFocus = previousNavigation.current === null && handle?.notFound === true;
    if (
      firstRenderNeedsFocus ||
      (previousNavigation.current !== null &&
        previousNavigation.current.some(
          (value, index) => value !== [pathname, adminSection][index],
        ))
    ) {
      const main = document.getElementById('main-content');
      if (main) {
        main.scrollTop = 0;
        main.focus({ preventScroll: true });
      }
      if (typeof window.matchMedia === 'function')
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    previousNavigation.current = [pathname, adminSection];
  }, [pathname, adminSection, handle?.notFound]);
  const denied =
    result?.status === 'ready' &&
    (adminLayout
      ? snapshot?.viewer?.systemRole !== 'ADMIN'
      : tripId
        ? snapshot?.trip?.permissions.canRead !== true
        : requiresViewer && !snapshot?.viewer);
  const routeContext: RouteContext = {
    viewer: snapshot?.viewer ?? null,
    previewEnabled: !!previewTripPath,
    ...(previewTripPath && demoAccess
      ? {
          demoLogin: {
            account: demoAccess.account,
            activate: (credentials) => {
              if (!demoAccess.accepts(credentials)) return false;
              setDemoActive(true);
              setScenario('success');
              navigate(paths.home);
              return true;
            },
          },
        }
      : {}),
  };
  const previewControls = previewTripPath ? (
    <details className="preview" data-preview="shell">
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
            if (next) {
              setDemoActive(false);
              setScenario(next);
            }
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
  ) : null;
  return (
    <AppShell
      snapshot={snapshot}
      adminLayout={adminLayout}
      adminSection={adminSection}
      onAdminSectionChange={setAdminSection}
      tripLayout={!!tripId}
      listLayout={listLayout}
      fullBleed={!!handle?.fullBleed}
      currentPath={policyPath}
      section={effectiveSection}
      onSectionChange={(next) => {
        if (tripId) {
          navigate(
            next === 'plan'
              ? paths.plan(tripId)
              : next === 'map'
                ? paths.map(tripId)
                : next === 'dress'
                  ? paths.dressCode(tripId)
                  : next === 'packing'
                    ? paths.packing(tripId)
                    : next === 'members'
                      ? paths.members(tripId)
                      : next === 'fund'
                        ? paths.fund(tripId)
                        : next === 'fare'
                          ? paths.priceWatch(tripId)
                          : next === 'settings'
                            ? paths.settings(tripId)
                            : paths.trip(tripId),
          );
        }
      }}
    >
      {demoActive && (
        <Alert>
          <p>
            Phiên demo · Chỉ dữ liệu fixture, không phải phiên đăng nhập Backend. Tải lại trang sẽ
            kết thúc phiên demo.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setDemoActive(false);
              setScenario('guest');
              navigate(paths.home);
            }}
          >
            Thoát phiên demo
          </Button>
        </Alert>
      )}
      {!handle?.notFound &&
        !membershipRecoveryRoute &&
        (!ownContentTitle || (!snapshot && !!requiresViewer) || denied) && (
          <h1 className="screen-title">{title}</h1>
        )}
      {!ownContentTitle && previewControls}
      {handle?.notFound ? (
        <Outlet context={routeContext} />
      ) : privateSessionBlocked ? (
        <ContentState state="loading" headingLevel={2} />
      ) : standaloneAuthRoute || membershipRecoveryRoute ? (
        <Outlet context={routeContext} />
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
        <Outlet context={routeContext} />
      )}
      {ownContentTitle && previewControls}
    </AppShell>
  );
}
