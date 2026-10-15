import { createBrowserRouter } from 'react-router';
import { App } from './App';
import { ContentState } from '../shared/components/ContentState';
import { TripListPage } from '../features/trips/TripListPage';
import { AuthPage } from '../features/auth/AuthPage';
import { ProfilePage } from '../features/auth/ProfilePage';
import { HomeRoute } from './HomeRoute';

export function createRouter(previewTripPath: string | null) {
  const placeholder = <ContentState state="placeholder" headingLevel={2} />;
  return createBrowserRouter([
    {
      element: <App previewTripPath={previewTripPath} />,
      errorElement: (
        <ContentState
          state="error"
          error={{ code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: false }}
        />
      ),
      children: [
        {
          path: '/',
          element: <HomeRoute />,
          handle: { title: 'Trang chủ', contentTitle: true, fullBleed: true },
        },
        {
          path: '/trips',
          element: <TripListPage previewEnabled={!!previewTripPath} />,
          handle: { title: 'Chuyến đi của tôi', layout: 'trip-list', requiresViewer: true },
        },
        { path: '/trips/:tripId', element: placeholder },
        { path: '/trips/:tripId/plan', element: placeholder },
        { path: '/trips/:tripId/members', element: placeholder },
        {
          path: '/profile',
          element: <ProfilePage previewEnabled={!!previewTripPath} />,
          handle: {
            title: 'Hồ sơ cá nhân',
            requiresViewer: true,
            contentTitle: true,
            fullBleed: true,
          },
        },
        {
          path: '/login',
          element: <AuthPage key="login" mode="login" previewEnabled={!!previewTripPath} />,
          handle: { title: 'Đăng nhập', contentTitle: true, fullBleed: true },
        },
        {
          path: '/register',
          element: <AuthPage key="register" mode="register" previewEnabled={!!previewTripPath} />,
          handle: { title: 'Đăng ký', contentTitle: true, fullBleed: true },
        },
        { path: '/admin', element: placeholder, handle: { layout: 'admin', requiresViewer: true } },
        { path: '*', element: <ContentState state="not-found" />, handle: { notFound: true } },
      ],
    },
  ]);
}
