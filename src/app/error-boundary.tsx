import { Component, type ReactNode } from 'react';
import { ContentState } from '../shared/components/ContentState';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <ContentState
        state="error"
        error={{
          code: 'SERVICE_UNAVAILABLE',
          correlationId: null,
          retryable: false,
        }}
        showHome
        onReload={() => window.location.reload()}
      />
    ) : (
      this.props.children
    );
  }
}
