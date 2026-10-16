import { createBrowserRouter } from 'react-router';
import { App } from './App';
import { ContentState } from '../shared/components/ContentState';
import { lazy, Suspense, type ReactNode } from 'react';
import type { DemoAccess } from '../features/auth/model/demo-access';
const TripListPage = lazy(async () => ({
  default: (await import('../features/trips/TripListPage')).TripListPage,
}));
const AuthPage = lazy(async () => ({
  default: (await import('../features/auth/AuthPage')).AuthPage,
}));
const ProfilePage = lazy(async () => ({
  default: (await import('../features/auth/ProfilePage')).ProfilePage,
}));
const HomeRoute = lazy(async () => ({ default: (await import('./HomeRoute')).HomeRoute }));
const TripOverviewPage = lazy(async () => ({
  default: (await import('../features/trips/TripOverviewPage')).TripOverviewPage,
}));
const PlanPage = lazy(async () => ({
  default: (await import('../features/plan/PlanPage')).PlanPage,
}));
const MembersPage = lazy(async () => ({
  default: (await import('../features/members/MembersPage')).MembersPage,
}));
const FundPage = lazy(async () => ({
  default: (await import('../features/fund/FundPage')).FundPage,
}));
const feature = (element: ReactNode) => (
  <Suspense fallback={<ContentState state="loading" headingLevel={2} />}>{element}</Suspense>
);

export function createRouter(previewTripPath: string | null, demoAccess?: DemoAccess) {
  const placeholder = <ContentState state="placeholder" headingLevel={2} />;
  return createBrowserRouter([
    {
      element: <App previewTripPath={previewTripPath} {...(demoAccess ? { demoAccess } : {})} />,
      errorElement: (
        <ContentState
          state="error"
          error={{ code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: false }}
        />
      ),
      children: [
        {
          path: '/',
          element: feature(<HomeRoute />),
          handle: { title: 'Trang chủ', contentTitle: true, fullBleed: true },
        },
        {
          path: '/trips',
          element: feature(<TripListPage previewEnabled={!!previewTripPath} />),
          handle: { title: 'Chuyến đi của tôi', layout: 'trip-list', requiresViewer: true },
        },
        {
          path: '/trips/:tripId',
          element: feature(<TripOverviewPage />),
          handle: { contentTitle: true, fullBleed: true, requiresViewer: true },
        },
        {
          path: '/trips/:tripId/plan',
          element: feature(<PlanPage />),
          handle: { contentTitle: true, fullBleed: true, requiresViewer: true },
        },
        {
          path: '/trips/:tripId/members',
          element: feature(<MembersPage />),
          handle: { contentTitle: true, fullBleed: true, requiresViewer: true },
        },
        {
          path: '/trips/:tripId/fund',
          element: feature(<FundPage />),
          handle: { contentTitle: true, fullBleed: true, requiresViewer: true },
        },
        {
          path: '/profile',
          element: feature(<ProfilePage previewEnabled={!!previewTripPath} />),
          handle: {
            title: 'Hồ sơ cá nhân',
            requiresViewer: true,
            contentTitle: true,
            fullBleed: true,
          },
        },
        {
          path: '/login',
          element: feature(
            <AuthPage key="login" mode="login" previewEnabled={!!previewTripPath} />,
          ),
          handle: { title: 'Đăng nhập', contentTitle: true, fullBleed: true },
        },
        {
          path: '/register',
          element: feature(
            <AuthPage key="register" mode="register" previewEnabled={!!previewTripPath} />,
          ),
          handle: { title: 'Đăng ký', contentTitle: true, fullBleed: true },
        },
        { path: '/admin', element: placeholder, handle: { layout: 'admin', requiresViewer: true } },
        { path: '*', element: <ContentState state="not-found" />, handle: { notFound: true } },
      ],
    },
  ]);
}
