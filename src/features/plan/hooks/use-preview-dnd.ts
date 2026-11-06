import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { DragDropManager, DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/react';
import type { PlanDraftActivity, PlanDraftMove } from '../model/plan-draft';
import {
  isPreviewDropNoop,
  previewDropIntent,
  previewDropIntentFromBoundary,
  previewContainerItems,
  type PreviewContainer,
  type PreviewDropIntent,
} from '../model/plan-drop-intent';

export interface PreviewDndControls {
  readonly draggingId: string | null;
  readonly intent: PreviewDropIntent | null;
  registerList: (container: PreviewContainer, element: HTMLElement | null) => void;
  onHandleKeyDown: (activityId: string, event: KeyboardEvent<HTMLButtonElement>) => void;
}

function focusHandle(id: string) {
  const handle = [...document.querySelectorAll<HTMLButtonElement>('[data-draft-handle]')].find(
    (element) => element.dataset.draftHandle === id,
  );
  handle?.focus({ preventScroll: true });
  handle?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}

/** Preview interaction state only; a drag never opens an editor or calls Gateway commands. */
export function usePreviewDnd({
  activities,
  day,
  canEdit,
  plannerOpen,
  openPlanner,
  onMove,
  revealPoolItem,
}: {
  activities: readonly PlanDraftActivity[];
  day: string;
  canEdit: boolean;
  plannerOpen: boolean;
  openPlanner: () => void;
  onMove: (move: PlanDraftMove) => void;
  revealPoolItem: () => void;
}) {
  const lists = useRef(new Map<PreviewContainer, HTMLElement>());
  const managerRef = useRef<DragDropManager | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const [drag, setDrag] = useState<{
    id: string;
    mode: 'pointer' | 'keyboard';
    intent: PreviewDropIntent | null;
  } | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useLayoutEffect(() => {
    if (pendingFocus.current) {
      focusHandle(pendingFocus.current);
      pendingFocus.current = null;
    }
  }, [activities, plannerOpen]);

  const finish = (id: string, intent: PreviewDropIntent | null, canceled = false) => {
    const changed = canEdit && !canceled && intent && !isPreviewDropNoop(activities, day, intent);
    if (changed) {
      if (intent.container === 'POOL') revealPoolItem();
      pendingFocus.current = id;
      onMove({
        activityId: id,
        target:
          intent.container === 'DAY'
            ? { type: 'DAY', day, index: intent.index }
            : { type: 'POOL', index: intent.index },
      });
    }
    setDrag(null);
    setAnnouncement(
      changed ? 'Đã sắp xếp. Chỉ lưu trên thiết bị này.' : 'Không thay đổi lịch trình.',
    );
    window.requestAnimationFrame(() => focusHandle(id));
  };

  // Radix Drawer listens at document capture. Cancel the drag before Escape can close it.
  useEffect(() => {
    if (!drag) return;
    const cancel = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      if (drag.mode === 'pointer') void managerRef.current?.actions.stop({ canceled: true, event });
      setDrag(null);
      setAnnouncement('Đã hủy kéo thả. Không thay đổi lịch trình.');
      window.requestAnimationFrame(() => focusHandle(drag.id));
    };
    window.addEventListener('keydown', cancel, true);
    return () => window.removeEventListener('keydown', cancel, true);
  }, [drag]);

  const pointerIntent = (id: string, point: { x: number; y: number }) => {
    for (const [container, list] of lists.current) {
      const bounds = list.getBoundingClientRect();
      if (
        point.x < bounds.left ||
        point.x > bounds.right ||
        point.y < Math.max(0, bounds.top) ||
        point.y > Math.min(innerHeight, bounds.bottom)
      )
        continue;
      const items = previewContainerItems(activities, day, container);
      const sourceIndex = items.findIndex((item) => item.id === id);
      // Geometry stays fixed while dragging. Ignore the lifted row and its placeholder.
      const rows = [...list.querySelectorAll<HTMLElement>(':scope > [data-draft-activity]')].filter(
        (row) => row.dataset.draftActivity !== id,
      );
      // A filtered list may contain only the dragged row. There is no visible
      // boundary to choose in that state, so retain its original slot instead
      // of unexpectedly appending it after hidden rows.
      if (!rows.length && sourceIndex >= 0)
        return previewDropIntent(activities, day, id, container, sourceIndex);
      for (const [rowIndex, row] of rows.entries()) {
        const card = row.querySelector<HTMLElement>('[data-timeline-card]') ?? row;
        const rect = card.getBoundingClientRect();
        if (point.y < rect.top + rect.height / 2) {
          return previewDropIntentFromBoundary(activities, day, id, container, {
            beforeId: row.dataset.draftActivity ?? null,
            afterId: rows[rowIndex - 1]?.dataset.draftActivity ?? null,
          });
        }
      }
      return previewDropIntentFromBoundary(activities, day, id, container, {
        beforeId: null,
        afterId: rows.at(-1)?.dataset.draftActivity ?? null,
      });
    }
    return null;
  };

  const onDragStart = (event: DragStartEvent, manager: DragDropManager) => {
    const id = event.operation.source?.id;
    if (!canEdit || id == null) return;
    managerRef.current = manager;
    setDrag({ id: String(id), mode: 'pointer', intent: null });
  };
  const onDragMove = (event: DragMoveEvent) => {
    const id = event.operation.source?.id;
    if (id == null || !canEdit) return;
    const point = event.to ?? event.operation.position.current;
    setDrag({ id: String(id), mode: 'pointer', intent: pointerIntent(String(id), point) });
  };
  const onDragEnd = (event: DragEndEvent) => {
    const id = event.operation.source?.id;
    if (id == null) return;
    const point =
      event.nativeEvent instanceof PointerEvent
        ? { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY }
        : event.operation.position.current;
    finish(String(id), pointerIntent(String(id), point), event.canceled);
  };
  const onHandleKeyDown: PreviewDndControls['onHandleKeyDown'] = (id, event) => {
    if (
      !canEdit ||
      !['Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(
        event.key,
      )
    )
      return;
    const active = drag?.mode === 'keyboard' && drag.id === id ? drag : null;
    if (!active && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    const activity = activities.find((item) => item.id === id);
    if (!activity) return;
    if (!active) {
      const container = activity.scheduledDate === null ? 'POOL' : 'DAY';
      const index = previewContainerItems(activities, day, container).findIndex(
        (item) => item.id === id,
      );
      setDrag({
        id,
        mode: 'keyboard',
        intent: previewDropIntent(activities, day, id, container, index),
      });
      setAnnouncement(
        `Đang kéo ${activity.title}. Dùng mũi tên để chọn vị trí, Enter để thả, Escape để hủy.`,
      );
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      finish(id, active.intent);
      return;
    }
    if (event.key === 'Escape') {
      finish(id, null, true);
      return;
    }
    if (!active.intent) return;
    const container =
      event.key === 'ArrowLeft'
        ? 'POOL'
        : event.key === 'ArrowRight'
          ? 'DAY'
          : active.intent.container;
    if (container === 'POOL' && !plannerOpen) {
      pendingFocus.current = id;
      openPlanner();
    }
    const index =
      container !== active.intent.container
        ? 0
        : active.intent.index + (event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0);
    const intent = previewDropIntent(activities, day, id, container, index);
    setDrag({ id, mode: 'keyboard', intent });
    setAnnouncement(
      `Vị trí ${(intent?.index ?? 0) + 1} trong ${container === 'DAY' ? 'ngày đang chọn' : 'giỏ chưa xếp lịch'}. Chưa lưu; Enter để thả.`,
    );
    if (intent) {
      const list = lists.current.get(container);
      const anchor = [...(list?.querySelectorAll<HTMLElement>('[data-draft-activity]') ?? [])].find(
        (row) => row.dataset.draftActivity === (intent.beforeId ?? intent.afterId),
      );
      anchor?.scrollIntoView?.({ block: 'nearest' });
    }
  };

  return {
    draggingId: drag?.id ?? null,
    intent: drag?.intent ?? null,
    announcement,
    registerList: (container: PreviewContainer, element: HTMLElement | null) => {
      if (element) lists.current.set(container, element);
      else lists.current.delete(container);
    },
    onHandleKeyDown,
    onDragStart,
    onDragMove,
    onDragEnd,
  };
}
