import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
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
import type { FundRepository } from './features/fund/model/fund';
import { selectFundRepository } from './infrastructure/repositories/select-fund-repository';
import type { PriceWatchRepository } from './features/price-watch/model/price-watch';
import { selectPriceWatchRepository } from './infrastructure/repositories/select-price-watch-repository';
import type { MembershipRepository, InvitationRepository } from './features/members/model/members';
import { selectMembersRepositories } from './infrastructure/repositories/select-members-repositories';
import type { DemoAccess } from './features/auth/model/demo-access';
import { createGatewayHttpClient } from './infrastructure/http/http-client';
import { createAccessTokenStore } from './infrastructure/session/access-token-store';
import { createSessionManager } from './infrastructure/session/session-manager';
import { coordinateBrowserSession } from './infrastructure/session/coordinated-session';
import { createCommandCoordinator } from './infrastructure/operations/command-coordinator';
import { decodeFinanceReceipt } from './infrastructure/repositories/finance-decoders';

const previewAllowed = import.meta.env.DEV || import.meta.env.MODE === 'preview';
const fixtureSelected =
  (import.meta.env.VITE_DATA_MODE ?? (previewAllowed ? 'fixture' : 'gateway')) === 'fixture';
const element = document.getElementById('root');
if (!element) throw new Error('Root element missing');
const root = createRoot(element);
async function start() {
  try {
    const accessTokenStore = createAccessTokenStore();
    async function refreshSession() {
      return (await sessionManager.bootstrap()) === 'authenticated';
    }
    const gatewayHttpClient = createGatewayHttpClient({
      getAccessToken: accessTokenStore.get,
      onUnauthorized: refreshSession,
    });
    const localManager = createSessionManager(gatewayHttpClient, accessTokenStore);
    const sessionManager = fixtureSelected ? localManager : coordinateBrowserSession(localManager);
    let journal: Storage | undefined;
    try { journal = window.sessionStorage; } catch { /* Memory-only recovery when storage is blocked. */ }
    const commands = createCommandCoordinator(gatewayHttpClient, decodeFinanceReceipt, journal);
    sessionManager.subscribe(() => { if (sessionManager.status() !== 'authenticated') commands.invalidate(); });
    if (!fixtureSelected) void sessionManager.bootstrap().catch(() => undefined);
    let previewTripPath: string | null = null;
    let demoAccess: DemoAccess | undefined;
    let fixtureFactory: (() => ShellRepository) | undefined;
    let tripFixtureFactory: (() => TripRepository) | undefined;
    let identityFixtureFactory: (() => IdentityRepository) | undefined;
    let homeFixtureFactory: (() => HomeRepository) | undefined;
    let planFixtureFactory: (() => PlanRepository) | undefined;
    let fundFixtureFactory: (() => FundRepository) | undefined;
    let priceWatchFixtureFactory: (() => PriceWatchRepository) | undefined;
    let membersFixtureFactory:
      (() => { membership: MembershipRepository; invitation: InvitationRepository }) | undefined;
    if (import.meta.env.DEV || import.meta.env.MODE === 'preview') {
      if (fixtureSelected) {
        const { createFixtureTripStore } = await import('./infrastructure/fixtures/trip-store');
        const store = createFixtureTripStore();
        const { previewTripId, createFixtureShellRepository } =
          await import('./infrastructure/fixtures/shell.fixture-repository');
        previewTripPath = paths.trip(previewTripId);
        const { createFixtureDemoAccess } = await import('./infrastructure/fixtures/demo-access');
        demoAccess = createFixtureDemoAccess();
        fixtureFactory = () => createFixtureShellRepository({ store });
        const { createFixtureTripRepository } =
          await import('./infrastructure/fixtures/trip.fixture-repository');
        tripFixtureFactory = () => createFixtureTripRepository({ store });
        const { createFixtureIdentityRepository } =
          await import('./infrastructure/fixtures/identity.fixture-repository');
        identityFixtureFactory = createFixtureIdentityRepository;
        const { createFixtureHomeRepository } =
          await import('./infrastructure/fixtures/home.fixture-repository');
        homeFixtureFactory = createFixtureHomeRepository;
        const { createFixturePlanRepository } =
          await import('./infrastructure/fixtures/plan.fixture-repository');
        planFixtureFactory = () => createFixturePlanRepository({ store });
        const { createFixtureFundRepository } =
          await import('./infrastructure/fixtures/fund.fixture-repository');
        fundFixtureFactory = createFixtureFundRepository;
        const { createFixturePriceWatchRepository } =
          await import('./infrastructure/fixtures/price-watch.fixture-repository');
        priceWatchFixtureFactory = createFixturePriceWatchRepository;
        const [{ createFixtureMembershipRepository }, { createFixtureInvitationRepository }] =
          await Promise.all([
            import('./infrastructure/fixtures/membership.fixture-repository'),
            import('./infrastructure/fixtures/invitation.fixture-repository'),
          ]);
        membersFixtureFactory = () => ({
          membership: createFixtureMembershipRepository(),
          invitation: createFixtureInvitationRepository(),
        });
      }
    }
    const repository = await selectShellRepository(
      import.meta.env.VITE_DATA_MODE,
      previewAllowed,
      fixtureFactory,
      gatewayHttpClient,
    );
    const tripRepository = await selectTripRepository(
      import.meta.env.VITE_DATA_MODE,
      previewAllowed,
      tripFixtureFactory,
      gatewayHttpClient,
    );
    const identityRepository = selectIdentityRepository(
      import.meta.env.VITE_DATA_MODE,
      previewAllowed,
      identityFixtureFactory,
      gatewayHttpClient,
      sessionManager,
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
      gatewayHttpClient,
    );
    const fundRepository = selectFundRepository(
      import.meta.env.VITE_DATA_MODE,
      previewAllowed,
      fundFixtureFactory,
      gatewayHttpClient,
      commands,
    );
    const priceWatchRepository = selectPriceWatchRepository(
      import.meta.env.VITE_DATA_MODE,
      previewAllowed,
      priceWatchFixtureFactory,
    );
    const membersRepositories = selectMembersRepositories(
      import.meta.env.VITE_DATA_MODE,
      previewAllowed,
      membersFixtureFactory,
      gatewayHttpClient,
      commands,
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
            fundRepository={fundRepository}
            priceWatchRepository={priceWatchRepository}
            membersRepositories={membersRepositories}
            {...(!fixtureSelected ? { sessionManager } : {})}
          >
            <RouterProvider router={createRouter(previewTripPath, demoAccess)} />
          </Providers>
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (error) {
    root.render(
      error instanceof Error && error.message.startsWith('Demo 1 cần') ? (
        <main>
          <h1>Trình duyệt chưa được hỗ trợ</h1>
          <p>{error.message}</p>
        </main>
      ) : (
        <ContentState
          state="error"
          error={{ code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: false }}
        />
      ),
    );
  }
}
void start();
