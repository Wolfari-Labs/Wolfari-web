import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-500.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/latin-500.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/caveat/latin-700.css';
import '@fontsource/caveat/latin-ext-700.css';
import './shared/styles/global.css';
import { Providers } from './app/providers';
import { ErrorBoundary } from './app/error-boundary';
import { createRouter } from './app/router';
import { paths } from './app/route-paths';
import { selectShellRepository } from './infrastructure/repositories/select-shell-repository';
import { ContentState } from './shared/components/ContentState';
import type { ShellRepository } from './features/shell/repositories/shell.repository';

const previewAllowed = import.meta.env.DEV || import.meta.env.MODE === 'preview';
const fixtureSelected =
  (import.meta.env.VITE_DATA_MODE ?? (previewAllowed ? 'fixture' : 'gateway')) === 'fixture';
const element = document.getElementById('root');
if (!element) throw new Error('Root element missing');
const root = createRoot(element);
async function start() {
  try {
    let previewTripPath: string | null = null;
    let fixtureFactory: (() => ShellRepository) | undefined;
    if (import.meta.env.DEV || import.meta.env.MODE === 'preview') {
      if (fixtureSelected) {
        const { previewTripId, createFixtureShellRepository } =
          await import('./infrastructure/fixtures/shell.fixture-repository');
        previewTripPath = paths.trip(previewTripId);
        fixtureFactory = createFixtureShellRepository;
      }
    }
    const repository = await selectShellRepository(
      import.meta.env.VITE_DATA_MODE,
      previewAllowed,
      fixtureFactory,
    );
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <Providers repository={repository}>
            <RouterProvider router={createRouter(previewTripPath)} />
          </Providers>
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch {
    root.render(
      <ContentState
        state="error"
        error={{ code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: false }}
      />,
    );
  }
}
void start();
