import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useGatewayDnd } from '../src/features/plan/hooks/use-gateway-dnd';
import type { GatewayPlanMove } from '../src/features/plan/model/plan-arrangement';
import type { ActivityViewModel, PlanViewModel } from '../src/features/plan/model/plan';

const day = '2026-11-06';
const activity = (id: string, position: number): ActivityViewModel => ({
  id,
  tripId: 'trip',
  title: id,
  description: null,
  publicDescription: null,
  activityType: 'SIGHTSEEING',
  selectedLocationId: null,
  startsAt: null,
  endsAt: null,
  scheduledDate: day,
  position,
  status: 'TODO',
  source: 'MANUAL',
  planVersion: 1,
  createdByUserId: 'owner',
  completedByUserId: null,
  completedAt: null,
  presentation: { cover: null },
});
const plan: PlanViewModel = {
  tripId: 'trip',
  planVersion: 1,
  exportRevision: 1,
  permissions: { canRead: true, canEdit: true, canComplete: true },
  activities: [activity('a', 0), activity('b', 1)],
  selectedLocations: [],
  dressCodes: [],
  packingItems: [],
};

function Harness({
  canEdit = true,
  onArrange,
}: {
  canEdit?: boolean;
  onArrange: (move: GatewayPlanMove) => Promise<boolean>;
}) {
  const dnd = useGatewayDnd({
    plan,
    timezone: 'UTC',
    day,
    canEdit,
    poolOpen: false,
    openPool: () => undefined,
    revealDay: () => undefined,
    onArrange,
  });
  return (
    <div onTouchStartCapture={dnd.onTouchStartCapture}>
      <output data-testid="dragging">{dnd.draggingKey ?? 'idle'}</output>
      <ol ref={(element) => dnd.registerList(day, element)}>
        {plan.activities.map((item) => (
          <li key={item.id} data-plan-activity={item.id}>
            <button
              data-gateway-handle={`activity:${item.id}`}
              disabled={!canEdit}
              onKeyDown={(event) => dnd.onHandleKeyDown({ type: 'ACTIVITY', id: item.id }, event)}
            >
              Kéo {item.id}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(
    () => [new DOMRect(0, 0, 400, 400)] as unknown as DOMRectList,
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const id = this.dataset.planActivity;
    return id ? new DOMRect(0, id === 'a' ? 100 : 200, 400, 50) : new DOMRect(0, 80, 400, 300);
  });
});
afterEach(() => vi.restoreAllMocks());

function point(y: number, identifier = 1) {
  return { identifier, clientX: 20, clientY: y };
}
const primaryPointer = {
  pointerType: 'touch',
  pointerId: 7,
  isPrimary: true,
  clientX: 20,
  clientY: 270,
};
function beginTouch(active = true) {
  fireEvent.touchStart(screen.getByRole('button', { name: 'Kéo a' }), {
    touches: [point(120)],
    changedTouches: [point(120)],
  });
  if (active)
    fireEvent.touchMove(window, {
      touches: [point(270)],
      changedTouches: [point(270)],
    });
}
function endTouch() {
  fireEvent.touchEnd(window, { touches: [], changedTouches: [point(270)] });
}
function expectTouchReleased() {
  const observe = vi.fn();
  window.addEventListener('touchmove', observe, true);
  const move = createEvent.touchMove(window, {
    touches: [point(270)],
    changedTouches: [point(270)],
    cancelable: true,
  });
  fireEvent(window, move);
  window.removeEventListener('touchmove', observe, true);
  expect(observe).toHaveBeenCalledOnce();
  expect(move.defaultPrevented).toBe(false);
  endTouch();
}

describe('Gateway native touch gesture lifecycle', () => {
  it('still commits an active touch drop once and restores handle focus', async () => {
    const onArrange = vi.fn<(move: GatewayPlanMove) => Promise<boolean>>().mockResolvedValue(true);
    render(<Harness onArrange={onArrange} />);
    beginTouch();
    expect(screen.getByTestId('dragging')).toHaveTextContent('activity:a');
    expect(onArrange).not.toHaveBeenCalled();
    endTouch();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Kéo a' })).toHaveFocus());
    expect(onArrange).toHaveBeenCalledExactlyOnceWith({
      source: { type: 'ACTIVITY', id: 'a' },
      target: { day, index: 1 },
    });
    expect(screen.getByTestId('dragging')).toHaveTextContent('idle');
    expectTouchReleased();
    expect(onArrange).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'Escape releases native listeners (activated: %s) without a write',
    (active) => {
      const onArrange = vi
        .fn<(move: GatewayPlanMove) => Promise<boolean>>()
        .mockResolvedValue(true);
      render(<Harness onArrange={onArrange} />);
      beginTouch(active);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.getByTestId('dragging')).toHaveTextContent('idle');
      expect(screen.getByRole('button', { name: 'Kéo a' })).toHaveFocus();
      expectTouchReleased();
      expect(onArrange).not.toHaveBeenCalled();
    },
  );

  it('retains Chromium primary pointer/touch bridging and ignores its duplicate touchend', async () => {
    const onArrange = vi.fn<(move: GatewayPlanMove) => Promise<boolean>>().mockResolvedValue(true);
    render(<Harness onArrange={onArrange} />);
    beginTouch(false);
    fireEvent.pointerMove(window, primaryPointer);
    expect(screen.getByTestId('dragging')).toHaveTextContent('activity:a');
    fireEvent.pointerUp(window, primaryPointer);
    endTouch();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Kéo a' })).toHaveFocus());
    expect(onArrange).toHaveBeenCalledExactlyOnceWith({
      source: { type: 'ACTIVITY', id: 'a' },
      target: { day, index: 1 },
    });
    expectTouchReleased();
    expect(onArrange).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'a second finger touchstart cancels (activated: %s), restores focus and cannot commit on stale end',
    (active) => {
      const onArrange = vi
        .fn<(move: GatewayPlanMove) => Promise<boolean>>()
        .mockResolvedValue(true);
      render(<Harness onArrange={onArrange} />);
      beginTouch(active);
      fireEvent.touchStart(window, {
        touches: [point(270), point(240, 2)],
        changedTouches: [point(240, 2)],
      });
      expect(screen.getByTestId('dragging')).toHaveTextContent('idle');
      expect(screen.getByRole('button', { name: 'Kéo a' })).toHaveFocus();
      fireEvent.touchEnd(window, {
        touches: [point(270)],
        changedTouches: [point(240, 2)],
      });
      fireEvent.pointerUp(window, primaryPointer);
      expectTouchReleased();
      expect(onArrange).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])(
    'a secondary touch pointerdown cancels before touchstart (activated: %s)',
    (active) => {
      const onArrange = vi
        .fn<(move: GatewayPlanMove) => Promise<boolean>>()
        .mockResolvedValue(true);
      render(<Harness onArrange={onArrange} />);
      beginTouch(active);
      const secondaryPointer = { ...primaryPointer, pointerId: 8, isPrimary: false };
      fireEvent.pointerDown(window, secondaryPointer);
      expect(screen.getByTestId('dragging')).toHaveTextContent('idle');
      expect(screen.getByRole('button', { name: 'Kéo a' })).toHaveFocus();
      fireEvent.pointerUp(window, secondaryPointer);
      fireEvent.pointerUp(window, primaryPointer);
      expectTouchReleased();
      expect(onArrange).not.toHaveBeenCalled();
    },
  );

  it('rejects a foreign touchend even if its start was not observed', () => {
    const onArrange = vi.fn<(move: GatewayPlanMove) => Promise<boolean>>().mockResolvedValue(true);
    render(<Harness onArrange={onArrange} />);
    beginTouch();
    fireEvent.touchEnd(window, { touches: [], changedTouches: [point(270, 2)] });
    expect(screen.getByTestId('dragging')).toHaveTextContent('idle');
    expect(screen.getByRole('button', { name: 'Kéo a' })).toHaveFocus();
    expectTouchReleased();
    expect(onArrange).not.toHaveBeenCalled();
  });

  it('unmount removes active native listeners without intercepting later input or writing', () => {
    const onArrange = vi.fn<(move: GatewayPlanMove) => Promise<boolean>>().mockResolvedValue(true);
    const view = render(<Harness onArrange={onArrange} />);
    beginTouch();
    view.unmount();
    expectTouchReleased();
    expect(onArrange).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'becoming readonly/disabled cancels touch (activated: %s) and allows a fresh gesture after reenabling',
    async (active) => {
      const onArrange = vi
        .fn<(move: GatewayPlanMove) => Promise<boolean>>()
        .mockResolvedValue(true);
      const view = render(<Harness onArrange={onArrange} />);
      beginTouch(active);
      view.rerender(<Harness canEdit={false} onArrange={onArrange} />);
      expect(screen.getByTestId('dragging')).toHaveTextContent('idle');
      expectTouchReleased();
      expect(onArrange).not.toHaveBeenCalled();
      view.rerender(<Harness onArrange={onArrange} />);
      beginTouch();
      endTouch();
      await waitFor(() => expect(onArrange).toHaveBeenCalledTimes(1));
    },
  );
});
