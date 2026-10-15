import { createBrowserRouter } from 'react-router';
import { App } from './App';
import { ContentState } from '../shared/components/ContentState';
import { TripListPage } from '../features/trips/TripListPage';

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
        { path: '/', element: placeholder, handle: { title: 'Trang chủ' } },
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
          element: placeholder,
          handle: { title: 'Hồ sơ cá nhân', requiresViewer: true },
        },
        { path: '/login', element: placeholder, handle: { title: 'Đăng nhập' } },
        { path: '/register', element: placeholder, handle: { title: 'Đăng ký' } },
        { path: '/admin', element: placeholder, handle: { layout: 'admin', requiresViewer: true } },
        { path: '*', element: <ContentState state="not-found" />, handle: { notFound: true } },
      ],
    },
  ]);
}
