import type { ReactNode } from 'react';
import type { TripPlanSnapshotState } from '../hooks/use-trip-plan-snapshot';
import { ContentState } from '../../../shared/components/ContentState';

export function TripPlanBoundary({ state, onRetry, children }: { state: TripPlanSnapshotState; onRetry: () => void; children: ReactNode }) {
  if (state.status === 'loading') return <ContentState state="loading" headingLevel={2} />;
  if (state.status === 'empty') return <ContentState state="empty" headingLevel={2} />;
  if (state.status === 'error')
    return <ContentState state={state.error.code === 'SERVICE_UNAVAILABLE' && !state.error.retryable ? 'unavailable' : 'error'} error={state.error} onRetry={onRetry} headingLevel={2} />;
  return <>{children}</>;
}
