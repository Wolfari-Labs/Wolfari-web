import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { Link, useParams, useOutletContext } from 'react-router';
import { Accessibility } from '@dnd-kit/dom';
import {
  DragDropProvider,
  useDragDropManager,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import type { RouteContext } from '../../app/route-context';
import { paths } from '../../app/route-paths';
import type { TripDetailViewModel } from '../trips/model/trip-detail';
import { TripHero } from '../trips/components/TripHero';
import { useTripPlanSnapshot } from './hooks/use-trip-plan-snapshot';
import { usePlanDraft } from './hooks/use-plan-draft';
import {
  planScenarios,
  type PlanScenario,
  type PlanViewModel,
} from './model/plan';
import {
  draftActivitiesForDay,
  unscheduledDraftActivities,
  validatePlanDraftEdit,
  type PlanDraftActivity,
  type PlanDraftEdit,
  type PlanDraftMove,
} from './model/plan-draft';
import { activityTime, planDays } from './model/plan-presentation';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Select } from '../../shared/components/Select';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import mountain from '../../shared/assets/figma/eb8f3.svg';
import meal from '../../shared/assets/figma/41563.svg';
import beach from '../../shared/assets/figma/e9568.svg';
import walk from '../../shared/assets/figma/9c64a.svg';
import activityMetric from '../../shared/assets/figma/b75a6.svg';
import locationMetric from '../../shared/assets/figma/12507.svg';
import timeMetric from '../../shared/assets/figma/13a40.svg';
import travelMetric from '../../shared/assets/figma/a6d01.svg';
import styles from './PlanPage.module.css';
import { mergePlaceSelections, usePlaceSelection } from '../map/place-selection-store';

const icons: Record<string, string> = {
  SIGHTSEEING: mountain,
  MEAL: meal,
  BEACH: beach,
  WALK: walk,
};

type Container = 'POOL' | 'DAY';
type DropData = {
  readonly container: Container;
  readonly index: number;
  readonly activityId?: string;
  readonly label?: string;
};

function useCompactPlanner() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 1200px)');
    if (!media) return;
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return compact;
}

function localClock(value: string | null, timezone: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: timezone,
  }).format(new Date(value));
}

function focusableElements(dialog: HTMLDialogElement) {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.getClientRects().length > 0);
}

function trapDialogFocus(event: ReactKeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab') return;
  const elements = focusableElements(event.currentTarget);
  const first = elements[0];
  const last = elements.at(-1);
  if (!first || !last) {
    event.preventDefault();
    event.currentTarget.focus();
  } else if (
    event.shiftKey &&
    (document.activeElement === first || !event.currentTarget.contains(document.activeElement))
  ) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    (document.activeElement === last || !event.currentTarget.contains(document.activeElement))
  ) {
    event.preventDefault();
    first.focus();
  }
}

function NativeDialog({
  open,
  className,
  label,
  initialFocusRef,
  onDismiss,
  children,
}: {
  open: boolean;
  className: string | undefined;
  label: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      window.requestAnimationFrame(() => initialFocusRef?.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [initialFocusRef, open]);
  return (
    <dialog
      ref={dialogRef}
      hidden={!open}
      className={className}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onKeyDown={trapDialogFocus}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom
        ) onDismiss();
      }}
    >
      {children}
    </dialog>
  );
}

function DragHandle({ label, handleRef, onKeyMove }: { label: string; handleRef: (element: Element | null) => void; onKeyMove?: (direction: 'to-day' | 'to-pool') => void }) {
  const manager = useDragDropManager();
  return (
    <button
      ref={handleRef}
      type="button"
      className={styles.dragHandle}
      aria-label={label}
      title="Kéo để sắp xếp"
      onKeyDownCapture={(event) => {
        const direction = event.key === 'ArrowRight' ? 'to-day' : event.key === 'ArrowLeft' ? 'to-pool' : null;
        if (direction && onKeyMove) {
          event.preventDefault();
          event.stopPropagation();
          // This shortcut owns the move. Cancel the sensor's drag so its later
          // drop cannot overwrite the asynchronous draft update.
          if (manager?.dragOperation.source) manager.actions.stop({ canceled: true, event: event.nativeEvent });
          onKeyMove(direction);
        }
      }}
    >
      <span aria-hidden="true">⠿</span>
    </button>
  );
}

type TimelineActivityProps = {
  activity: PlanDraftActivity;
  index: number;
  timezone: string;
  canEdit: boolean;
  onEdit: (trigger: HTMLButtonElement) => void;
  onKeyMove?: (direction: 'to-day' | 'to-pool') => void;
};

function TimelineActivityRow({
  activity,
  index,
  timezone,
  canEdit,
  onEdit,
  onKeyMove,
  rowRef,
  handleRef,
  dragging,
  dropTarget,
}: TimelineActivityProps & {
  rowRef?: (element: Element | null) => void;
  handleRef?: (element: Element | null) => void;
  dragging?: boolean;
  dropTarget?: boolean;
}) {
  const icon = icons[activity.activityType];
  const hasTime = Boolean(activity.startsAt);
  return (
    <li
      ref={rowRef}
      className={styles.activity}
      data-dragging={dragging || undefined}
      data-drop-target={dropTarget || undefined}
    >
      <span className={styles.step} aria-hidden="true">{index + 1}</span>
      <div className={styles.card}>
        <time className={styles.time} dateTime={activity.startsAt ?? undefined}>
          {hasTime ? (
            <>{activityTime(activity.startsAt, timezone)}{activity.endsAt && <span> – {activityTime(activity.endsAt, timezone)}</span>}</>
          ) : <span className={styles.unscheduledTime}>Chưa xếp giờ</span>}
        </time>
        {icon && <span className={styles.icon}><img src={icon} alt="" /></span>}
        <details className={styles.activityPreview}>
          <summary aria-label={`Xem hoạt động ${activity.title}`}>
            <strong>{activity.title}</strong>
            <small>{activity.description ?? 'Xem hoạt động'}</small>
          </summary>
          <dl>
            <dt>Thời gian</dt>
            <dd>{hasTime ? `${activityTime(activity.startsAt, timezone)}${activity.endsAt ? ` – ${activityTime(activity.endsAt, timezone)}` : ''}` : 'Chưa xếp giờ'}</dd>
            <dt>Trạng thái</dt>
            <dd>{activity.status === 'TODO' ? 'Chưa hoàn tất' : 'Đã hoàn tất'}</dd>
            <dt>Địa điểm liên kết</dt>
            <dd>{activity.selectedLocationId ? 'Có địa điểm đã chọn' : 'Chưa có địa điểm'}</dd>
          </dl>
          <p>Chỉ lưu trên thiết bị này · Chưa đồng bộ với thành viên khác.</p>
          {canEdit && <Button variant="outline" onClick={(event) => onEdit(event.currentTarget)}>Chỉnh sửa hoạt động</Button>}
        </details>
        {activity.presentation.cover && <img className={styles.cover} src={activity.presentation.cover.src} alt={activity.presentation.cover.alt} />}
        {handleRef && <DragHandle handleRef={handleRef} label={`Kéo hoạt động ${activity.title}`} {...(onKeyMove ? { onKeyMove } : {})} />}
      </div>
    </li>
  );
}

function SortableTimelineActivity(props: TimelineActivityProps) {
  const sortable = useSortable<DropData>({
    id: props.activity.id,
    index: props.index,
    group: 'ACTIVITIES',
    data: {
      container: 'DAY',
      index: props.index,
      activityId: props.activity.id,
      label: props.activity.title,
    },
  });
  return (
    <TimelineActivityRow
      {...props}
      rowRef={sortable.ref}
      handleRef={sortable.handleRef}
      dragging={sortable.isDragging}
      dropTarget={sortable.isDropTarget}
    />
  );
}

function TimelineList({
  items,
  day,
  timezone,
  canEdit,
  dragEnabled,
  onEdit,
  onKeyMove,
}: {
  items: readonly PlanDraftActivity[];
  day: string;
  timezone: string;
  canEdit: boolean;
  dragEnabled: boolean;
  onEdit: (activity: PlanDraftActivity, trigger: HTMLButtonElement) => void;
  onKeyMove?: (activityId: string, direction: 'to-day' | 'to-pool') => void;
}) {
  const endDrop = useDroppable<DropData>({
    id: `drop:day:${day}`,
    data: { container: 'DAY', index: items.length, label: 'cuối lịch trình' },
    disabled: !dragEnabled,
  });
  if (!items.length && !dragEnabled) return <ContentState state="empty" headingLevel={2} />;
  return (
    <ol
      ref={endDrop.ref}
      className={`${styles.timelineViewport} ${endDrop.isDropTarget ? styles.dropTarget : ''}`}
      tabIndex={0}
      aria-label="Các hoạt động trong ngày"
    >
      {items.map((activity, index) => {
        const props: TimelineActivityProps = {
          activity,
          index,
          timezone,
          canEdit,
          onEdit: (trigger) => onEdit(activity, trigger),
          onKeyMove: (direction) => onKeyMove?.(activity.id, direction),
        };
        return dragEnabled
          ? <SortableTimelineActivity key={activity.id} {...props} />
          : <TimelineActivityRow key={activity.id} {...props} />;
      })}
      {!items.length && <li className={styles.emptyDrop}>Kéo hoạt động vào đây để thêm vào ngày này.</li>}
      {items.length > 0 && dragEnabled && <li className={styles.endDrop}>Thả ở đây để xếp cuối ngày</li>}
    </ol>
  );
}

function PoolCard({ activity, index, canEdit, onKeyMove }: { activity: PlanDraftActivity; index: number; canEdit: boolean; onKeyMove?: (direction: 'to-day' | 'to-pool') => void }) {
  const sortable = useSortable<DropData>({
    id: activity.id,
    index,
    group: 'ACTIVITIES',
    data: { container: 'POOL', index, activityId: activity.id, label: activity.title },
    disabled: !canEdit,
  });
  return (
    <li ref={sortable.ref} className={styles.poolCard} data-dragging={sortable.isDragging || undefined} data-drop-target={sortable.isDropTarget || undefined}>
      <span className={styles.poolIcon} aria-hidden="true">{icons[activity.activityType] && <img src={icons[activity.activityType]} alt="" />}</span>
      <span><strong>{activity.title}</strong><small>{activity.description ?? 'Hoạt động chưa xếp lịch'}</small></span>
      {canEdit && <DragHandle handleRef={sortable.handleRef} label={`Kéo hoạt động ${activity.title}`} {...(onKeyMove ? { onKeyMove } : {})} />}
    </li>
  );
}

function ActivityPool({
  items,
  canEdit,
  query,
  onQueryChange,
  storageStatus,
  onClose,
  closeRef,
  onKeyMove,
}: {
  items: readonly PlanDraftActivity[];
  canEdit: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  storageStatus: 'saved' | 'memory';
  onClose: () => void;
  closeRef?: RefObject<HTMLButtonElement | null>;
  onKeyMove?: (activityId: string, direction: 'to-day' | 'to-pool') => void;
}) {
  const poolDrop = useDroppable<DropData>({
    id: 'drop:pool',
    data: { container: 'POOL', index: items.length, label: 'danh sách chưa xếp' },
    disabled: !canEdit,
  });
  return (
    <section className={styles.pool} aria-labelledby="activity-pool-title">
      <header className={styles.poolHeader}>
        <div><h2 id="activity-pool-title">Hoạt động đã chọn</h2><p>{items.length} hoạt động chưa xếp lịch</p></div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Đóng danh sách hoạt động">×</button>
      </header>
      <div className={styles.localNotice} role="status">
        <strong>Chỉ lưu trên thiết bị này</strong>
        <span>Thay đổi chưa đồng bộ với thành viên khác và sẽ hết hạn sau 30 ngày.</span>
      </div>
      {storageStatus === 'memory' && <Alert live>Chưa thể lưu trên thiết bị. Thay đổi vẫn được giữ trong phiên hiện tại.</Alert>}
      {!canEdit && <Alert>Chế độ chỉ đọc · Bạn có thể xem nhưng không thể kéo thả hoặc chỉnh sửa.</Alert>}
      <Input label="Tìm trong hoạt động đã chọn" type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Tìm tên hoặc địa điểm" />
      <ul ref={poolDrop.ref} className={`${styles.poolList} ${poolDrop.isDropTarget ? styles.dropTarget : ''}`} aria-label="Hoạt động chưa xếp lịch">
        {items.map((activity, index) => <PoolCard key={activity.id} activity={activity} index={index} canEdit={canEdit} onKeyMove={(direction) => onKeyMove?.(activity.id, direction)} />)}
        {!items.length && (
          <li className={styles.poolEmpty}>
            <strong>Không có hoạt động phù hợp</strong>
            <span>{query ? 'Thử từ khóa khác.' : 'Chọn địa điểm ở trang bản đồ hoặc kéo hoạt động từ lịch trình vào đây.'}</span>
          </li>
        )}
      </ul>
    </section>
  );
}

function ActivityEditor({
  activity,
  latest,
  locationName,
  days,
  timezone,
  onSave,
  onDismiss,
}: {
  activity: PlanDraftActivity | null;
  latest: PlanDraftActivity | undefined;
  locationName: string;
  days: readonly string[];
  timezone: string;
  onSave: (edit: PlanDraftEdit, expected: PlanDraftActivity) => Promise<boolean>;
  onDismiss: () => void;
}) {
  const [title, setTitle] = useState(activity?.title ?? '');
  const [day, setDay] = useState(activity?.scheduledDate ?? days[0] ?? '');
  const [startTime, setStartTime] = useState(localClock(activity?.startsAt ?? null, timezone));
  const [endTime, setEndTime] = useState(localClock(activity?.endsAt ?? null, timezone));
  const [error, setError] = useState<string | null>(null);
  const [baseline, setBaseline] = useState(activity);
  const [saveConflict, setSaveConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  if (!activity) return null;
  const conflict = saveConflict || JSON.stringify(latest) !== JSON.stringify(baseline);
  const reload = () => {
    if (!latest) return;
    setBaseline(latest);
    setTitle(latest.title);
    setDay(latest.scheduledDate ?? days[0] ?? '');
    setStartTime(localClock(latest.startsAt, timezone));
    setEndTime(localClock(latest.endsAt, timezone));
    setError(null);
    setSaveConflict(false);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (conflict || saving || !baseline) return;
    const validation = validatePlanDraftEdit({ title, day, startTime, endTime, allowedDays: days });
    setError(validation);
    if (validation) return;
    setSaving(true);
    try {
      const saved = await onSave({ activityId: activity.id, title, day, startTime, endTime, timezone }, baseline);
      if (!saved) setSaveConflict(true);
    } finally {
      setSaving(false);
    }
  };
  return (
    <NativeDialog open className={styles.editorDialog} label="Chỉnh sửa hoạt động" initialFocusRef={titleRef} onDismiss={onDismiss}>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <header className={styles.dialogHeader}>
          <div><p>Chỉ lưu trên thiết bị này</p><h2>Chỉnh sửa hoạt động</h2></div>
          <button type="button" onClick={onDismiss} aria-label="Đóng chỉnh sửa hoạt động">×</button>
        </header>
        <div className={styles.editorFields}>
          {error && <Alert live>{error}</Alert>}
          {conflict && <Alert tone="warning" live>Hoạt động đã thay đổi ở tab khác hoặc không còn trong bản nháp. Nội dung bạn đang nhập vẫn được giữ. Hãy nạp bản mới hoặc hủy chỉnh sửa.</Alert>}
          <Input ref={titleRef} label="Tên hoạt động" required maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} error={error?.startsWith('Tên hoạt động') ? error : undefined} />
          <label className={styles.nativeField}>
            <span>Ngày</span>
            <select value={day} onChange={(event) => setDay(event.target.value)}>
              {days.map((value, index) => <option key={value} value={value}>Ngày {index + 1} · {value.slice(8, 10)}/{value.slice(5, 7)}/{value.slice(0, 4)}</option>)}
            </select>
          </label>
          <div className={styles.timeFields}>
            <Input label="Giờ bắt đầu" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            <Input label="Giờ kết thúc" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </div>
          <Input label="Địa điểm" value={locationName} readOnly />
        </div>
        <footer className={styles.dialogActions}><Button variant="outline" onClick={onDismiss}>Hủy</Button>{conflict && <Button variant="outline" disabled={!latest || saving} onClick={reload}>Nạp bản mới</Button>}<Button type="submit" disabled={conflict || saving}>Lưu thay đổi</Button></footer>
      </form>
    </NativeDialog>
  );
}

function PlannerWorkspace({
  trip,
  plan,
  day,
  items,
  poolItems,
  query,
  onQueryChange,
  storageStatus,
  compact,
  closeRef,
  onClose,
  onEdit,
  onKeyMove,
}: {
  trip: TripDetailViewModel;
  plan: PlanViewModel;
  day: string;
  items: readonly PlanDraftActivity[];
  poolItems: readonly PlanDraftActivity[];
  query: string;
  onQueryChange: (value: string) => void;
  storageStatus: 'saved' | 'memory';
  compact: boolean;
  closeRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onEdit: (activity: PlanDraftActivity, trigger: HTMLButtonElement) => void;
  onKeyMove: (activityId: string, direction: 'to-day' | 'to-pool') => void;
}) {
  const timeline = (
    <section className={styles.timeline} aria-labelledby={compact ? 'planner-day-title' : 'plan-day-title'}>
      <div className={styles.toolbar}><h2 id={compact ? 'planner-day-title' : 'plan-day-title'}>Lịch trình ngày {planDays(trip.startAt, trip.endAt, trip.timezone).indexOf(day) + 1}</h2></div>
      <TimelineList items={items} day={day} timezone={trip.timezone} canEdit={plan.permissions.canEdit} dragEnabled={plan.permissions.canEdit} onEdit={onEdit} onKeyMove={onKeyMove} />
    </section>
  );
  const pool = <ActivityPool items={poolItems} canEdit={plan.permissions.canEdit} query={query} onQueryChange={onQueryChange} storageStatus={storageStatus} onClose={onClose} closeRef={closeRef} onKeyMove={onKeyMove} />;
  if (!compact) return <div className={`${styles.columns} ${styles.withPlanner}`}>{timeline}{pool}</div>;
  return (
    <NativeDialog open className={styles.plannerDialog} label="Thêm hoạt động vào lịch trình" initialFocusRef={closeRef} onDismiss={onClose}>
      <div className={styles.plannerDialogHeader}><div><p>Chỉ lưu trên thiết bị này</p><h2>Thêm hoạt động vào lịch trình</h2></div></div>
      <div className={styles.plannerDialogBody}>{pool}{timeline}</div>
    </NativeDialog>
  );
}

export function PlanView({
  trip,
  plan,
  activities,
  selectedDay,
  onDayChange,
  plannerOpen,
  onPlannerOpen,
  onPlannerClose,
  storageStatus,
  onMove,
  onEdit,
  onKeyMove,
}: {
  trip: TripDetailViewModel;
  plan: PlanViewModel;
  activities: readonly PlanDraftActivity[];
  selectedDay: string | null;
  onDayChange: (day: string) => void;
  plannerOpen: boolean;
  onPlannerOpen: () => void;
  onPlannerClose: () => void;
  storageStatus: 'saved' | 'memory';
  onMove: (move: PlanDraftMove) => void;
  onEdit: (edit: PlanDraftEdit, expected: PlanDraftActivity) => Promise<boolean>;
  onKeyMove?: (activityId: string, direction: 'to-day' | 'to-pool') => void;
}) {
  const days = planDays(trip.startAt, trip.endAt, trip.timezone);
  const day = selectedDay && days.includes(selectedDay) ? selectedDay : days[0]!;
  const items = draftActivitiesForDay(activities, day);
  const allPoolItems = unscheduledDraftActivities(activities);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<PlanDraftActivity | null>(null);
  const editReturnFocus = useRef<HTMLButtonElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const compact = useCompactPlanner();
  useEffect(() => {
    if (editing !== null || !editReturnFocus.current) return;
    // Wait for the closing render to remove the modal before focusing outside
    // it. A requestAnimationFrame from an async save can precede that commit.
    const target = editReturnFocus.current.isConnected ? editReturnFocus.current : addButtonRef.current;
    target?.focus();
    editReturnFocus.current = null;
  }, [editing]);
  const normalizedQuery = query.trim().toLocaleLowerCase('vi');
  const poolItems = allPoolItems.filter((activity) => `${activity.title} ${activity.description ?? ''}`.toLocaleLowerCase('vi').includes(normalizedQuery));
  const locationMap = useMemo(() => new Map(plan.selectedLocations.map((location) => [location.id, location])), [plan.selectedLocations]);
  const closePlanner = () => {
    onPlannerClose();
    window.requestAnimationFrame(() => addButtonRef.current?.focus());
  };
  const closeEditor = () => {
    setEditing(null);
  };
  const beginEdit = (activity: PlanDraftActivity, trigger: HTMLButtonElement) => {
    editReturnFocus.current = trigger;
    setEditing(activity);
  };
  const onDragEnd = ({ canceled, operation }: DragEndEvent) => {
    if (canceled || !operation.source || !operation.target) return;
    const target = operation.target.data as DropData | undefined;
    if (!target || (target.container !== 'POOL' && target.container !== 'DAY')) return;
    const activityId = String(operation.source.id);
    if (target.container === 'POOL') {
      const targetIndex = target.activityId
        ? allPoolItems.findIndex((activity) => activity.id === target.activityId)
        : allPoolItems.length;
      onMove({ activityId, target: { type: 'POOL', index: targetIndex < 0 ? allPoolItems.length : targetIndex } });
      return;
    }
    onMove({ activityId, target: { type: 'DAY', day, index: target.index } });
  };
  const keyboardMove = (activityId: string, direction: 'to-day' | 'to-pool') => {
    onKeyMove?.(activityId, direction);
  };
  return (
    <>
      <div className={styles.hero}><TripHero trip={trip} compact variant="schedule" /></div>
      {storageStatus === 'memory' && <Alert tone="warning" live>Không thể lưu vào trình duyệt. Bản nháp chỉ được giữ trong bộ nhớ của tab này và sẽ mất khi tải lại hoặc đóng tab.</Alert>}
      <div className={styles.days} role="group" aria-label="Ngày trong lịch trình">
        {days.map((date, index) => <button key={date} type="button" aria-pressed={date === day} onClick={() => onDayChange(date)}>Ngày {index + 1}<small>{date.slice(8, 10)}/{date.slice(5, 7)}</small></button>)}
        <Button variant="outline" disabled>+ Thêm ngày</Button>
      </div>
      <div className={styles.metrics}>
        <div><span className={styles.metricIcon}><img src={activityMetric} alt="" /></span><span><strong>{activities.length}</strong>Hoạt động</span></div>
        <div><span className={styles.metricIcon}><img src={locationMetric} alt="" /></span><span><strong>{plan.selectedLocations.length}</strong>Địa điểm</span></div>
        <div><span className={styles.metricIcon}><img src={timeMetric} alt="" /></span><span><strong>{items.filter((activity) => activity.status === 'COMPLETED').length}/{items.length}</strong>Hoàn tất trong ngày</span></div>
        <div><span className={styles.metricIcon}><img src={travelMetric} alt="" /></span><span><strong>—</strong>Di chuyển · Chưa khả dụng</span></div>
      </div>
      <DragDropProvider
        plugins={(defaults) => [...defaults, Accessibility.configure({
          screenReaderInstructions: { draggable: 'Nhấn Enter hoặc phím cách để bắt đầu kéo. Dùng các phím mũi tên để di chuyển, Enter để thả và Escape để hủy.' },
          announcements: {
            dragstart: ({ operation }: DragStartEvent) => `Đã bắt đầu kéo ${String(operation.source?.data.label ?? 'hoạt động')}.`,
            dragover: ({ operation }: DragOverEvent) => operation.target ? `Đang ở ${String(operation.target.data.label ?? 'vùng thả')}.` : undefined,
            dragend: ({ operation }: DragEndEvent) => operation.canceled ? 'Đã hủy kéo thả.' : `Đã thả ${String(operation.source?.data.label ?? 'hoạt động')}.`,
          },
        })]}
        onDragEnd={onDragEnd}
      >
        {!plannerOpen && (
          <div className={styles.columns}>
            <section className={styles.timeline} aria-labelledby="plan-day-title">
              <div className={styles.toolbar}>
                <h2 id="plan-day-title">Lịch trình ngày {days.indexOf(day) + 1}</h2>
                <Button variant="outline" disabled>Hiện bản đồ</Button>
                <Button ref={addButtonRef} onClick={onPlannerOpen}>Thêm hoạt động</Button>
              </div>
               <TimelineList items={items} day={day} timezone={trip.timezone} canEdit={plan.permissions.canEdit} dragEnabled={false} onEdit={beginEdit} />
            </section>
          </div>
        )}
        {plannerOpen && <PlannerWorkspace trip={trip} plan={plan} day={day} items={items} poolItems={poolItems} query={query} onQueryChange={setQuery} storageStatus={storageStatus} compact={compact} closeRef={closeRef} onClose={closePlanner} onEdit={beginEdit} onKeyMove={keyboardMove} />}
      </DragDropProvider>
      <ActivityEditor
        key={editing?.id ?? 'closed'}
        activity={editing}
        latest={activities.find((activity) => activity.id === editing?.id)}
        locationName={(editing?.selectedLocationId && locationMap.get(editing.selectedLocationId)?.name) || 'Chưa có địa điểm'}
        days={days}
        timezone={trip.timezone}
        onSave={async (edit, expected) => {
          const saved = await onEdit(edit, expected);
          if (saved) closeEditor();
          return saved;
        }}
        onDismiss={closeEditor}
      />
    </>
  );
}

export function PlanPage() {
  const { tripId = '' } = useParams();
  const { previewEnabled } = useOutletContext<RouteContext>();
  const [scenario, setScenario] = useState<PlanScenario>('success');
  const [day, setDay] = useState<string | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [commandState, setCommandState] = useState('idle');
  const snapshot = useTripPlanSnapshot(tripId, scenario);
  const trip = snapshot.state.status === 'ready' ? snapshot.state.trip : null;
  const plan = snapshot.state.status === 'ready' ? snapshot.state.plan : null;
  const userId = trip?.currentMembership.userId ?? '';
  const localSelection = usePlaceSelection(userId, tripId);
  const effectivePlan = useMemo(() => plan ? { ...plan, selectedLocations: mergePlaceSelections(plan.selectedLocations, plan.activities, localSelection) } : null, [localSelection, plan]);
  const draft = usePlanDraft({ userId, tripId, plan: effectivePlan, locations: effectivePlan?.selectedLocations ?? [], timezone: trip?.timezone ?? 'UTC' });
  const error = snapshot.state.status === 'error' ? snapshot.state.error : null;
  return (
    <section className={styles.page} data-flow="plan-preview" data-local-draft="true" data-node-id="20:236">
      <div className={styles.breadcrumb}><Link to={paths.trip(tripId)}>Tổng quan chuyến đi</Link><span aria-hidden="true">›</span><h1>Lịch trình</h1></div>
      {error ? (
        <ContentState state={error.code === 'SERVICE_UNAVAILABLE' && !error.retryable ? 'unavailable' : 'error'} error={error} headingLevel={2} onRetry={snapshot.retry} />
      ) : snapshot.state.status === 'loading' ? (
        <ContentState state="loading" headingLevel={2} />
      ) : trip && effectivePlan ? (
        <PlanView trip={trip} plan={effectivePlan} activities={draft.activities} selectedDay={day} onDayChange={setDay} plannerOpen={plannerOpen} onPlannerOpen={() => setPlannerOpen(true)} onPlannerClose={() => setPlannerOpen(false)} storageStatus={draft.storageStatus} onMove={draft.move} onEdit={draft.edit} onKeyMove={(activityId, direction) => draft.move(direction === 'to-pool' ? { activityId, target: { type: 'POOL' } } : { activityId, target: { type: 'DAY', day: day ?? planDays(trip.startAt, trip.endAt, trip.timezone)[0]!, index: 0 } })} />
      ) : <ContentState state="empty" headingLevel={2} />}
      {previewEnabled && (
        <details className="preview" data-preview="plan">
          <summary>Plan preview · Dữ liệu minh họa</summary>
          {trip && plan && <p className={styles.revisions}>Plan {plan.planVersion} · Membership {trip.membershipRevision} · Export {plan.exportRevision} · {plan.permissions.canEdit ? 'Có quyền sửa lịch trình' : 'Không có quyền sửa lịch trình'} · {plan.permissions.canComplete ? 'Có quyền hoàn tất' : 'Không có quyền hoàn tất'}</p>}
          <Select label="Trạng thái lịch trình" value={scenario} onChange={(event) => { const next = planScenarios.find((value) => value === event.target.value); if (next) setScenario(next); }}>{planScenarios.map((value) => <option key={value}>{value}</option>)}</Select>
          <Select label="Trạng thái thao tác preview" value={commandState} onChange={(event) => setCommandState(event.target.value)}>{['idle', 'pending', 'unknown'].map((value) => <option key={value}>{value}</option>)}</Select>
          {commandState !== 'idle' && <Alert live>{commandState === 'pending' ? 'Minh họa đang xử lý · Không có request đang gửi.' : 'Minh họa kết quả chưa xác định · Chưa xác nhận thay đổi hoặc tăng phiên bản.'}</Alert>}
        </details>
      )}
    </section>
  );
}
