import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import './shared/styles/fonts.css';
import './shared/styles/global.css';
import { Providers } from './app/providers';
import { ErrorBoundary } from './app/error-boundary';
import { createRouter } from './app/router';
import { paths } from './app/route-paths';
import { selectShellRepository } from './infrastructure/repositories/select-shell-repository';
import { ContentState } from './shared/components/ContentState';
import type { ShellRepository } from './features/shell/repositories/shell.repository';
import type { TripRepository } from './features/trips/repositories/trip.repository';
import { selectTripRepository } from './infrastructure/repositories/select-trip-repository';
import { selectIdentityRepository } from './infrastructure/repositories/select-identity-repository';
import type { IdentityRepository } from './features/auth/model/identity';
import type { HomeRepository } from './features/home/model/home';
import { selectHomeRepository } from './infrastructure/repositories/select-home-repository';
import type { PlanRepository } from './features/plan/model/plan';
import { selectPlanRepository } from './infrastructure/repositories/select-plan-repository';

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
    let tripFixtureFactory: (() => TripRepository) | undefined;
    let identityFixtureFactory: (() => IdentityRepository) | undefined;
    let homeFixtureFactory: (() => HomeRepository) | undefined;
    let planFixtureFactory: (() => PlanRepository) | undefined;
    if (import.meta.env.DEV || import.meta.env.MODE === 'preview') {
      if (fixtureSelected) {
        const { previewTripId, createFixtureShellRepository } =
          await import('./infrastructure/fixtures/shell.fixture-repository');
        previewTripPath = paths.trip(previewTripId);
        fixtureFactory = createFixtureShellRepository;
        const { createFixtureTripRepository } =
          await import('./infrastructure/fixtures/trip.fixture-repository');
        tripFixtureFactory = createFixtureTripRepository;
        const { createFixtureIdentityRepository } =
          await import('./infrastructure/fixtures/identity.fixture-repository');
        identityFixtureFactory = createFixtureIdentityRepository;
        const { createFixtureHomeRepository } =
          await import('./infrastructure/fixtures/home.fixture-repository');
        homeFixtureFactory = createFixtureHomeRepository;
        const { createFixturePlanRepository } =
          await import('./infrastructure/fixtures/plan.fixture-repository');
        planFixtureFactory = createFixturePlanRepository;
      }
    }
    const repository = await selectShellRepository(
      import.meta.env.VITE_DATA_MODE,
      previewAllowed,
      fixtureFactory,
    );
    const tripRepository = await selectTripRepository(
      import.meta.env.VITE_DATA_MODE,
      previewAllowed,
      tripFixtureFactory,
    );
    const identityRepository = selectIdentityRepository(
      import.meta.env.VITE_DATA_MODE,
      previewAllowed,
      identityFixtureFactory,
    );
    const homeRepository = selectHomeRepository(
      import.meta.env.VITE_DATA_MODE,
      previewAllowed,
      homeFixtureFactory,
    );
    const planRepository = selectPlanRepository(
      import.meta.env.VITE_DATA_MODE,
      previewAllowed,
      planFixtureFactory,
    );
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <Providers
            repository={repository}
            tripRepository={tripRepository}
            identityRepository={identityRepository}
            homeRepository={homeRepository}
            planRepository={planRepository}
          >
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
