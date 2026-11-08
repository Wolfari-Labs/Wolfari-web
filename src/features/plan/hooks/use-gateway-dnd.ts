import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type TouchEvent,
} from 'react';
import type { DragDropManager, DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/react';
import type { ActivityViewModel, PlanViewModel } from '../model/plan';
import type { GatewayPlanMove } from '../model/plan-arrangement';
import { localDate } from '../model/plan-presentation';

type Source = GatewayPlanMove['source'];
export interface GatewayDropIntent extends GatewayPlanMove {
  readonly beforeId: string | null;
  readonly afterId: string | null;
}
export interface GatewayDndControls {
  readonly draggingKey: string | null;
  readonly intent: GatewayDropIntent | null;
  registerList: (day: string | null, element: HTMLElement | null) => void;
  registerDay: (day: string | null, element: HTMLElement | null) => void;
  onHandleKeyDown: (source: Source, event: KeyboardEvent<HTMLButtonElement>) => void;
  onHandleTouchStart: (source: Source, event: TouchEvent<HTMLButtonElement>) => void;
  onTouchStartCapture: (event: TouchEvent<HTMLElement>) => void;
}
export const gatewayActivityDay = (activity: ActivityViewModel, timezone: string) =>
  activity.startsAt ? localDate(activity.startsAt, timezone) : (activity.scheduledDate ?? null);
export const gatewayDragKey = (source: Source) => `${source.type.toLowerCase()}:${source.id}`;

/** UI insertion state only. All persistence goes through the existing Gateway command owner. */
export function useGatewayDnd({
  plan,
  timezone,
  day,
  canEdit,
  poolOpen,
  openPool,
  revealDay,
  onArrange,
}: {
  plan: PlanViewModel;
  timezone: string;
  day: string;
  canEdit: boolean;
  poolOpen: boolean;
  openPool: () => void;
  revealDay: (day: string) => void;
  onArrange: (move: GatewayPlanMove) => Promise<boolean>;
}) {
  const lists = useRef(new Map<string | null, HTMLElement>());
  const dayTargets = useRef(new Map<string | null, HTMLElement>());
  const managerRef = useRef<DragDropManager | null>(null);
  const pendingFocus = useRef<Source | null>(null);
  const submitting = useRef(false);
  const touch = useRef<{
    source: Source;
    identifier: number;
    pointerId: number | null;
    start: { x: number; y: number };
    last: { x: number; y: number };
    active: boolean;
  } | null>(null);
  const touchCleanup = useRef<(() => void) | null>(null);
  const clearTouch = useCallback(() => {
    touch.current = null;
    const cleanup = touchCleanup.current;
    touchCleanup.current = null;
    cleanup?.();
  }, []);
  const [, requestFocus] = useState(0);
  const [drag, setDrag] = useState<{
    source: Source;
    mode: 'pointer' | 'keyboard';
    intent: GatewayDropIntent | null;
  } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  useLayoutEffect(() => () => clearTouch(), [clearTouch]);
  useLayoutEffect(() => {
    if (canEdit || (!drag && !touch.current)) return;
    const nativeTouch = touch.current !== null;
    clearTouch();
    if (!nativeTouch && drag?.mode === 'pointer')
      void managerRef.current?.actions.stop({ canceled: true });
    pendingFocus.current = null;
    setDrag(null);
    setAnnouncement('Đã hủy kéo thả. Không thay đổi lịch trình.');
  }, [canEdit, drag, clearTouch]);
  const ordered = [...plan.activities].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );
  const itemsForDay = (targetDay: string | null) =>
    ordered.filter((activity) => gatewayActivityDay(activity, timezone) === targetDay);
  const sourceFromKey = (key: string): Source | null => {
    if (key.startsWith('activity:')) {
      const id = key.slice('activity:'.length);
      return plan.activities.some((activity) => activity.id === id)
        ? { type: 'ACTIVITY', id }
        : null;
    }
    if (key.startsWith('location:')) {
      const id = key.slice('location:'.length);
      return plan.selectedLocations.some((location) => location.id === id)
        ? { type: 'LOCATION', id }
        : null;
    }
    return null;
  };
  const focusSource = (source: Source) => {
    const activity =
      source.type === 'LOCATION'
        ? plan.activities.find((item) => item.selectedLocationId === source.id)
        : null;
    const keys = [
      ...(activity ? [gatewayDragKey({ type: 'ACTIVITY', id: activity.id })] : []),
      gatewayDragKey(source),
    ];
    const handles = [...document.querySelectorAll<HTMLButtonElement>('[data-gateway-handle]')];
    const handle = keys
      .map((key) => handles.find((element) => element.dataset.gatewayHandle === key))
      .find((element) => element && !element.disabled && element.getClientRects().length);
    if (!handle) return false;
    handle.focus({ preventScroll: true });
    handle.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    return document.activeElement === handle;
  };
  // Snapshot refresh and pending=false may be separate React commits. Do not lose the
  // focus request while the matching handle is temporarily disabled or has a new ID.
  useLayoutEffect(() => {
    if (!submitting.current && pendingFocus.current && focusSource(pendingFocus.current))
      pendingFocus.current = null;
  });

  const intentAt = (source: Source, targetDay: string | null, index: number) => {
    if (source.type === 'LOCATION' && targetDay === null) return null;
    const remaining = itemsForDay(targetDay).filter(
      (activity) => source.type !== 'ACTIVITY' || activity.id !== source.id,
    );
    const slot = Math.max(0, Math.min(index, remaining.length));
    return {
      source,
      target: { day: targetDay, index: slot },
      beforeId: remaining[slot]?.id ?? null,
      afterId: remaining[slot - 1]?.id ?? null,
    } satisfies GatewayDropIntent;
  };
  const isNoop = (intent: GatewayDropIntent) =>
    intent.source.type === 'ACTIVITY' &&
    itemsForDay(intent.target.day).findIndex((activity) => activity.id === intent.source.id) ===
      intent.target.index;
  const finish = async (source: Source, intent: GatewayDropIntent | null, canceled = false) => {
    setDrag(null);
    pendingFocus.current = source;
    if (!canEdit || canceled || !intent || isNoop(intent) || submitting.current) {
      setAnnouncement('Không thay đổi lịch trình.');
      return;
    }
    if (intent.target.day === null) openPool();
    else revealDay(intent.target.day);
    submitting.current = true;
    setAnnouncement('Đang lưu sắp xếp lịch trình…');
    try {
      const saved = await onArrange({ source: intent.source, target: intent.target });
      if (!saved) {
        const sourceWasInPool =
          source.type === 'LOCATION' ||
          !ordered.some(
            (activity) =>
              activity.id === source.id && gatewayActivityDay(activity, timezone) !== null,
          );
        // Keep a failed pool-origin move visible so the user can reconcile or retry
        // the same command without hunting through another panel.
        if (sourceWasInPool) openPool();
      }
      setAnnouncement(
        saved
          ? 'Máy chủ đã nhận sắp xếp. Bạn có thể tiếp tục kéo hoặc chủ động chỉnh sửa hoạt động.'
          : 'Chưa xác nhận lưu hoàn tất. Xem thông báo lịch trình trước khi tiếp tục.',
      );
    } catch {
      setAnnouncement('Chưa xác nhận lưu hoàn tất. Xem thông báo lịch trình.');
    } finally {
      submitting.current = false;
      // The authoritative refresh can finish in a different React commit. Force
      // one post-submit layout pass after the handle is enabled/created again.
      requestFocus((value) => value + 1);
    }
  };

  useEffect(() => {
    const cancel = (event: globalThis.KeyboardEvent) => {
      const source = drag?.source ?? touch.current?.source;
      if (event.key !== 'Escape' || !source) return;
      event.preventDefault();
      event.stopPropagation();
      const nativeTouch = touch.current !== null;
      clearTouch();
      if (!nativeTouch && drag?.mode === 'pointer')
        void managerRef.current?.actions.stop({ canceled: true, event });
      pendingFocus.current = source;
      setDrag(null);
      setAnnouncement('Đã hủy kéo thả. Không thay đổi lịch trình.');
    };
    window.addEventListener('keydown', cancel, true);
    return () => window.removeEventListener('keydown', cancel, true);
  }, [drag, clearTouch]);

  const contains = (element: HTMLElement, point: { x: number; y: number }) => {
    if (!element.getClientRects().length) return false;
    const rect = element.getBoundingClientRect();
    let left = Math.max(0, rect.left);
    let right = Math.min(innerWidth, rect.right);
    let top = Math.max(0, rect.top);
    let bottom = Math.min(innerHeight, rect.bottom);
    // ALL-day lists and the compact planner may be clipped by a scrolling
    // ancestor. Off-screen geometry must never become a valid drop surface.
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const computed = getComputedStyle(parent);
      const bounds = parent.getBoundingClientRect();
      if (['auto', 'scroll', 'hidden', 'clip'].includes(computed.overflowX)) {
        left = Math.max(left, bounds.left);
        right = Math.min(right, bounds.right);
      }
      if (['auto', 'scroll', 'hidden', 'clip'].includes(computed.overflowY)) {
        top = Math.max(top, bounds.top);
        bottom = Math.min(bottom, bounds.bottom);
      }
    }
    return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
  };
  const pointerIntent = (source: Source, point: { x: number; y: number }) => {
    for (const [targetDay, list] of lists.current) {
      if (!contains(list, point)) continue;
      const targetItems = itemsForDay(targetDay);
      const remaining = targetItems.filter(
        (activity) => source.type !== 'ACTIVITY' || activity.id !== source.id,
      );
      const rows = [...list.querySelectorAll<HTMLElement>(':scope > [data-plan-activity]')].filter(
        (row) => source.type !== 'ACTIVITY' || row.dataset.planActivity !== source.id,
      );
      const original = targetItems.findIndex(
        (activity) => source.type === 'ACTIVITY' && activity.id === source.id,
      );
      if (!rows.length && original >= 0) return intentAt(source, targetDay, original);
      let beforeId: string | null = null;
      let afterId: string | null = null;
      for (const row of rows) {
        const card = row.querySelector<HTMLElement>('[data-timeline-card]') ?? row;
        const rect = card.getBoundingClientRect();
        if (point.y < rect.top + rect.height / 2) {
          beforeId = row.dataset.planActivity ?? null;
          break;
        }
        afterId = row.dataset.planActivity ?? null;
      }
      const slot = beforeId
        ? remaining.findIndex((activity) => activity.id === beforeId)
        : afterId
          ? remaining.findIndex((activity) => activity.id === afterId) + 1
          : remaining.length;
      const intent = intentAt(source, targetDay, slot);
      return intent ? { ...intent, beforeId, afterId } : null;
    }
    for (const [targetDay, target] of dayTargets.current) {
      if (contains(target, point))
        return intentAt(source, targetDay, itemsForDay(targetDay).length);
    }
    return null;
  };
  const touchPoint = (event: TouchEvent<HTMLButtonElement>) => {
    const point = event.changedTouches[0] ?? event.touches[0];
    return point ? { x: point.clientX, y: point.clientY, identifier: point.identifier } : null;
  };
  const onHandleTouchStart = (source: Source, event: TouchEvent<HTMLButtonElement>) => {
    if (!canEdit || submitting.current || event.touches.length !== 1) return;
    const point = touchPoint(event);
    if (!point) return;
    clearTouch();
    touch.current = {
      source,
      identifier: point.identifier,
      pointerId: null,
      start: point,
      last: point,
      active: false,
    };
    const cancel = () => {
      const current = touch.current;
      clearTouch();
      if (!current) return;
      pendingFocus.current = source;
      setDrag(null);
      setAnnouncement('Đã hủy kéo thả. Không thay đổi lịch trình.');
      requestFocus((value) => value + 1);
    };
    const foreignContact = (nativeEvent: globalThis.TouchEvent | globalThis.PointerEvent) => {
      const current = touch.current;
      if (!current) return true;
      if ('changedTouches' in nativeEvent) {
        if (
          nativeEvent.touches.length > 1 ||
          [...Array.from(nativeEvent.changedTouches), ...Array.from(nativeEvent.touches)].some(
            (point) => point.identifier !== current.identifier,
          )
        ) {
          cancel();
          return true;
        }
      } else {
        if (
          !nativeEvent.isPrimary ||
          (current.pointerId !== null && nativeEvent.pointerId !== current.pointerId)
        ) {
          cancel();
          return true;
        }
        current.pointerId = nativeEvent.pointerId;
      }
      return false;
    };
    const additionalContact = (nativeEvent: globalThis.TouchEvent | globalThis.PointerEvent) => {
      if ('pointerType' in nativeEvent && nativeEvent.pointerType !== 'touch') return;
      // A second finger cancels; its eventual end must never commit the first drag.
      foreignContact(nativeEvent);
    };
    const pointFromNative = (nativeEvent: globalThis.TouchEvent | globalThis.PointerEvent) => {
      if ('changedTouches' in nativeEvent) {
        const touchPoint = nativeEvent.changedTouches[0] ?? nativeEvent.touches[0];
        return touchPoint ? { x: touchPoint.clientX, y: touchPoint.clientY } : null;
      }
      return { x: nativeEvent.clientX, y: nativeEvent.clientY };
    };
    const move = (nativeEvent: globalThis.TouchEvent | globalThis.PointerEvent) => {
      if ('pointerType' in nativeEvent && nativeEvent.pointerType !== 'touch') return;
      if (foreignContact(nativeEvent)) return;
      const current = touch.current;
      const currentPoint = pointFromNative(nativeEvent);
      if (!current || !currentPoint) return;
      // Only an owned gesture may intercept capture-phase input. A canceled or
      // unmounted timeline must leave subsequent touch events untouched.
      nativeEvent.stopImmediatePropagation();
      current.last = currentPoint;
      const distance = Math.hypot(
        currentPoint.x - current.start.x,
        currentPoint.y - current.start.y,
      );
      if (!current.active && distance < 8) return;
      nativeEvent.preventDefault();
      if (!current.active) {
        current.active = true;
        setDrag({ source, mode: 'pointer', intent: pointerIntent(source, currentPoint) });
        setAnnouncement('Đang kéo. Thả vào vị trí được đánh dấu để sắp xếp.');
      } else {
        setDrag((drag) =>
          drag && gatewayDragKey(drag.source) === gatewayDragKey(source)
            ? { ...drag, intent: pointerIntent(source, currentPoint) }
            : drag,
        );
      }
    };
    const end = (nativeEvent: globalThis.TouchEvent | globalThis.PointerEvent) => {
      if ('pointerType' in nativeEvent && nativeEvent.pointerType !== 'touch') return;
      if (foreignContact(nativeEvent)) return;
      const current = touch.current;
      if (!current) return;
      nativeEvent.stopImmediatePropagation();
      const currentPoint = pointFromNative(nativeEvent);
      clearTouch();
      if (!current.active) return;
      nativeEvent.preventDefault();
      void finish(source, pointerIntent(source, currentPoint ?? current.last));
    };
    const options = { capture: true, passive: false } as const;
    window.addEventListener('touchstart', additionalContact, options);
    window.addEventListener('touchmove', move, options);
    window.addEventListener('touchend', end, options);
    window.addEventListener('touchcancel', cancel, options);
    // Chromium emits pointer events for CDP/touch emulation and may finish the
    // gesture with pointerup before touchend. Track both event families.
    window.addEventListener('pointerdown', additionalContact, options);
    window.addEventListener('pointermove', move, options);
    window.addEventListener('pointerup', end, options);
    window.addEventListener('pointercancel', cancel, options);
    touchCleanup.current = () => {
      window.removeEventListener('touchstart', additionalContact, true);
      window.removeEventListener('touchmove', move, true);
      window.removeEventListener('touchend', end, true);
      window.removeEventListener('touchcancel', cancel, true);
      window.removeEventListener('pointerdown', additionalContact, true);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', end, true);
      window.removeEventListener('pointercancel', cancel, true);
    };
  };
  const onTouchStartCapture = (event: TouchEvent<HTMLElement>) => {
    const handle = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(
      '[data-gateway-handle]',
    );
    const key = handle?.dataset.gatewayHandle;
    const source = key ? sourceFromKey(key) : null;
    if (source) onHandleTouchStart(source, event as unknown as TouchEvent<HTMLButtonElement>);
  };
  const onDragStart = (event: DragStartEvent, manager: DragDropManager) => {
    const source = sourceFromKey(String(event.operation.source?.id ?? ''));
    if (!source || !canEdit || submitting.current) return;
    managerRef.current = manager;
    setDrag({ source, mode: 'pointer', intent: null });
  };
  const onDragMove = (event: DragMoveEvent) => {
    const source = sourceFromKey(String(event.operation.source?.id ?? ''));
    if (!source || !canEdit || submitting.current) return;
    setDrag({
      source,
      mode: 'pointer',
      intent: pointerIntent(source, event.to ?? event.operation.position.current),
    });
  };
  const onDragEnd = (event: DragEndEvent) => {
    const source = sourceFromKey(String(event.operation.source?.id ?? ''));
    if (!source) return;
    const point =
      event.nativeEvent instanceof PointerEvent
        ? { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY }
        : event.operation.position.current;
    void finish(source, pointerIntent(source, point), event.canceled);
  };
  const onHandleKeyDown: GatewayDndControls['onHandleKeyDown'] = (source, event) => {
    if (
      !canEdit ||
      submitting.current ||
      !['Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(
        event.key,
      )
    )
      return;
    const active =
      drag?.mode === 'keyboard' && gatewayDragKey(drag.source) === gatewayDragKey(source)
        ? drag
        : null;
    if (!active && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    if (!active) {
      const activity = ordered.find((item) => item.id === source.id);
      const sourceDay = activity ? gatewayActivityDay(activity, timezone) : null;
      const index = itemsForDay(sourceDay).findIndex((item) => item.id === source.id);
      setDrag({
        source,
        mode: 'keyboard',
        intent: intentAt(source, sourceDay, Math.max(0, index)),
      });
      setAnnouncement(
        'Đang kéo. Lên xuống chọn vị trí, trái về giỏ, phải sang ngày, Enter thả, Escape hủy.',
      );
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      void finish(source, active.intent);
      return;
    }
    if (event.key === 'Escape') {
      void finish(source, null, true);
      return;
    }
    if (event.key === 'ArrowRight' && (day === 'ALL' || day === 'POOL')) {
      setAnnouncement('Chọn một ngày cụ thể trước khi chuyển hoạt động từ giỏ sang lịch trình.');
      return;
    }
    const targetDay =
      event.key === 'ArrowLeft'
        ? null
        : event.key === 'ArrowRight'
          ? day
          : (active.intent?.target.day ?? null);
    if (targetDay === null && !poolOpen) {
      pendingFocus.current = source;
      openPool();
    }
    const index =
      targetDay !== active.intent?.target.day
        ? 0
        : (active.intent?.target.index ?? 0) +
          (event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0);
    const intent = intentAt(source, targetDay, index);
    setDrag({ source, mode: 'keyboard', intent });
    setAnnouncement(
      intent
        ? `Vị trí ${intent.target.index + 1} trong ${targetDay ?? 'giỏ chưa xếp lịch'}. Enter để thả.`
        : 'Địa điểm đang ở giỏ. Nhấn mũi tên phải để đưa vào ngày đang chọn.',
    );
    if (intent) {
      const anchor = [
        ...(lists.current.get(targetDay)?.querySelectorAll<HTMLElement>('[data-plan-activity]') ??
          []),
      ].find((row) => row.dataset.planActivity === (intent.beforeId ?? intent.afterId));
      anchor?.scrollIntoView?.({ block: 'nearest' });
    }
  };
  return {
    draggingKey: drag ? gatewayDragKey(drag.source) : null,
    intent: drag?.intent ?? null,
    announcement,
    registerList: (targetDay: string | null, element: HTMLElement | null) => {
      if (element) lists.current.set(targetDay, element);
      else lists.current.delete(targetDay);
    },
    registerDay: (targetDay: string | null, element: HTMLElement | null) => {
      if (element) dayTargets.current.set(targetDay, element);
      else dayTargets.current.delete(targetDay);
    },
    onHandleKeyDown,
    onHandleTouchStart,
    onTouchStartCapture,
    onDragStart,
    onDragMove,
    onDragEnd,
  };
}
