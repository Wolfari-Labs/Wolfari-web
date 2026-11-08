import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
  type KeyboardEvent,
} from 'react';
import { Link, useParams, useOutletContext } from 'react-router';
import { Accessibility } from '@dnd-kit/dom';
import {
  DragDropProvider,
  useDroppable,
  DragOverlay,
  PointerSensor,
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
import { usePreviewDnd, type PreviewDndControls } from './hooks/use-preview-dnd';
import { usePlanRepository } from './repositories/plan-context';
import { GatewayPlanPanel } from './components/GatewayPlanPanel';
import { planScenarios, type PlanScenario, type PlanViewModel } from './model/plan';
import {
  draftActivitiesForDay,
  unscheduledDraftActivities,
  validatePlanDraftEdit,
  type PlanDraftActivity,
  type PlanDraftEdit,
  type PlanDraftMove,
} from './model/plan-draft';
import { activityTime, planDays } from './model/plan-presentation';
import { Drawer } from '../../shared/components/Drawer';
import { TimelineCard } from './components/TimelineCard';
import { MotionProvider } from '../../shared/components/MotionProvider';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Select } from '../../shared/components/Select';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import mountain from '../../shared/assets/figma/eb8f3.svg';
import meal from '../../shared/assets/figma/41563.svg';
import beach from '../../shared/assets/figma/e9568.svg';
import walk from '../../shared/assets/figma/9c64a.svg';
import { PlanMetrics } from './components/PlanMetrics';
import dragIcon from '../../shared/assets/figma/56e25.svg';
import moreIcon from '../../shared/assets/figma/ca9fb.svg';
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

function PlannerDialog({
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
  return (
    <Drawer
      open={open}
      label={label}
      onDismiss={onDismiss}
      side="center"
      className={className ?? ''}
      showHeader={false}
      {...(initialFocusRef ? { initialFocusRef } : {})}
    >
      {children}
    </Drawer>
  );
}

function DragHandle({
  label,
  activityId,
  handleRef,
  onKeyDown,
}: {
  label: string;
  activityId: string;
  handleRef: (element: Element | null) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      ref={handleRef}
      type="button"
      className={styles.dragHandle}
      aria-label={label}
      data-draft-handle={activityId}
      title="Kéo để sắp xếp"
      onKeyDown={onKeyDown}
    >
      <img src={dragIcon} alt="" />
    </button>
  );
}

type TimelineActivityProps = {
  activity: PlanDraftActivity;
  index: number;
  timezone: string;
  canEdit: boolean;
  onEdit: (trigger: HTMLButtonElement) => void;
  dnd: PreviewDndControls;
};

function TimelineActivityRow({
  activity,
  index,
  timezone,
  canEdit,
  onEdit,
  dnd,
  rowRef,
  handleRef,
  dragging,
}: TimelineActivityProps & {
  rowRef?: (element: Element | null) => void;
  handleRef?: (element: Element | null) => void;
  dragging?: boolean;
}) {
  const time = activity.startsAt
    ? `${activityTime(activity.startsAt, timezone)}${activity.endsAt ? ' – ' + activityTime(activity.endsAt, timezone) : ''}`
    : 'Chưa xếp giờ';
  return (
    <li
      data-draft-activity={activity.id}
      ref={rowRef}
      className={styles.activity}
      data-dragging={dragging || undefined}
      data-insert-before={
        (dnd.intent?.container === 'DAY' && dnd.intent.beforeId === activity.id) || undefined
      }
      data-insert-after={
        (dnd.intent?.container === 'DAY' &&
          !dnd.intent.beforeId &&
          dnd.intent.afterId === activity.id) ||
        undefined
      }
    >
      <span className={styles.step} aria-hidden="true">
        {index + 1}
      </span>
      <TimelineCard
        title={activity.title}
        time={time}
        description={activity.description}
        completed={activity.status === 'COMPLETED'}
        cover={activity.presentation.cover}
        typeIcon={icons[activity.activityType] ?? null}
        handle={
          handleRef && (
            <DragHandle
              handleRef={handleRef}
              activityId={activity.id}
              label={`Kéo hoạt động ${activity.title}`}
              onKeyDown={(event) => dnd.onHandleKeyDown(activity.id, event)}
            />
          )
        }
        actions={
          <details className={styles.activityPreview}>
            <summary aria-label={`Xem hoạt động ${activity.title}`}>
              <img src={moreIcon} alt="" />
            </summary>
            <dl>
              <dt>Thời gian</dt>
              <dd>{time}</dd>
              <dt>Trạng thái</dt>
              <dd>{activity.status === 'TODO' ? 'Chưa hoàn tất' : 'Đã hoàn tất'}</dd>
              <dt>Địa điểm liên kết</dt>
              <dd>{activity.selectedLocationId ? 'Có địa điểm đã chọn' : 'Chưa có địa điểm'}</dd>
            </dl>
            <p>Chỉ lưu trên thiết bị này · Chưa đồng bộ với thành viên khác.</p>
            {canEdit && (
              <Button variant="outline" onClick={(event) => onEdit(event.currentTarget)}>
                Chỉnh sửa hoạt động
              </Button>
            )}
          </details>
        }
      />
    </li>
  );
}

function SortableTimelineActivity(props: TimelineActivityProps) {
  const sortable = useSortable<DropData>({
    id: props.activity.id,
    index: props.index,
    group: `DAY:${props.activity.scheduledDate}`,
    // Preview keeps fixed geometry and commits only on drop, not optimistic DOM sorting.
    plugins: [],
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
      dragging={sortable.isDragging || props.dnd.draggingId === props.activity.id}
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
  dnd,
}: {
  items: readonly PlanDraftActivity[];
  day: string;
  timezone: string;
  canEdit: boolean;
  dragEnabled: boolean;
  onEdit: (activity: PlanDraftActivity, trigger: HTMLButtonElement) => void;
  dnd: PreviewDndControls;
}) {
  const endDrop = useDroppable<DropData>({
    id: `drop:day:${day}`,
    data: { container: 'DAY', index: items.length, label: 'cuối lịch trình' },
    disabled: !dragEnabled,
  });

  return (
    <ol
      ref={(element) => {
        endDrop.ref(element);
        dnd.registerList('DAY', element);
      }}
      className={styles.timelineViewport}
      data-draft-list="DAY"
      data-insertion-slot={dnd.intent?.container === 'DAY' ? dnd.intent.index : undefined}
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
          dnd,
        };
        return dragEnabled ? (
          <SortableTimelineActivity key={activity.id} {...props} />
        ) : (
          <TimelineActivityRow key={activity.id} {...props} />
        );
      })}
      {!items.length && (
        <li
          className={styles.emptyDrop}
          data-drop-active={dnd.intent?.container === 'DAY' || undefined}
        >
          <h3>Chưa có nội dung</h3>
          {dragEnabled && <p>Kéo hoạt động vào đây để thêm vào ngày này.</p>}
        </li>
      )}
      {items.length > 0 && dragEnabled && (
        <li
          className={styles.endDrop}
          data-drop-active={(dnd.intent?.container === 'DAY' && !dnd.intent.beforeId) || undefined}
        >
          Thả ở đây để xếp cuối ngày
        </li>
      )}
    </ol>
  );
}

function PoolCard({
  activity,
  index,
  canEdit,
  dnd,
  onEdit,
}: {
  activity: PlanDraftActivity;
  index: number;
  canEdit: boolean;
  dnd: PreviewDndControls;
  onEdit: (trigger: HTMLButtonElement) => void;
}) {
  const sortable = useSortable<DropData>({
    id: activity.id,
    index,
    group: 'POOL',
    plugins: [],
    data: { container: 'POOL', index, activityId: activity.id, label: activity.title },
    disabled: !canEdit,
  });
  return (
    <li
      ref={sortable.ref}
      className={styles.poolCard}
      data-draft-activity={activity.id}
      data-dragging={sortable.isDragging || dnd.draggingId === activity.id || undefined}
      data-insert-before={
        (dnd.intent?.container === 'POOL' && dnd.intent.beforeId === activity.id) || undefined
      }
      data-insert-after={
        (dnd.intent?.container === 'POOL' &&
          !dnd.intent.beforeId &&
          dnd.intent.afterId === activity.id) ||
        undefined
      }
    >
      {canEdit && (
        <DragHandle
          handleRef={sortable.handleRef}
          activityId={activity.id}
          label={`Kéo hoạt động ${activity.title}`}
          onKeyDown={(event) => dnd.onHandleKeyDown(activity.id, event)}
        />
      )}
      <span className={styles.poolIcon} aria-hidden="true">
        {icons[activity.activityType] && <img src={icons[activity.activityType]} alt="" />}
      </span>
      <span className={styles.poolCover}>
        {activity.presentation.cover ? (
          <img
            className={styles.poolCover}
            src={activity.presentation.cover.src}
            alt={activity.presentation.cover.alt}
          />
        ) : (
          <span>Chưa có ảnh</span>
        )}
      </span>
      <span className={styles.poolCopy}>
        <strong>{activity.title}</strong>
        <small>{activity.description ?? 'Hoạt động chưa xếp lịch'}</small>
      </span>
      <details className={styles.activityPreview}>
        <summary aria-label={`Xem hoạt động ${activity.title}`}>
          <img src={moreIcon} alt="" />
        </summary>
        <p>Chưa xếp lịch · Chỉ lưu trên thiết bị này.</p>
        {canEdit && (
          <Button variant="outline" onClick={(event) => onEdit(event.currentTarget)}>
            Chỉnh sửa hoạt động
          </Button>
        )}
      </details>
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
  dnd,
  onEdit,
}: {
  items: readonly PlanDraftActivity[];
  canEdit: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  storageStatus: 'saved' | 'memory';
  onClose: () => void;
  closeRef?: RefObject<HTMLButtonElement | null>;
  dnd: PreviewDndControls;
  onEdit: (activity: PlanDraftActivity, trigger: HTMLButtonElement) => void;
}) {
  const poolDrop = useDroppable<DropData>({
    id: 'drop:pool',
    data: { container: 'POOL', index: items.length, label: 'danh sách chưa xếp' },
    disabled: !canEdit,
  });
  return (
    <section className={styles.pool} aria-labelledby="activity-pool-title">
      <header className={styles.poolHeader}>
        <h2 id="activity-pool-title">Đã chọn · Chưa xếp lịch</h2>
        <span className={styles.poolCount}>{items.length} hoạt động</span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Đóng danh sách hoạt động"
        >
          × Đóng
        </button>
      </header>

      {storageStatus === 'memory' && (
        <Alert live>Chưa thể lưu trên thiết bị. Thay đổi vẫn được giữ trong phiên hiện tại.</Alert>
      )}
      {!canEdit && (
        <Alert>Chế độ chỉ đọc · Bạn có thể xem nhưng không thể kéo thả hoặc chỉnh sửa.</Alert>
      )}
      <div className={styles.poolSearch}>
        <Input
          label="Tìm trong hoạt động đã chọn"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Tìm trong địa điểm/hoạt động đã chọn…"
        />
      </div>
      <p className={styles.poolHint}>Kéo hoạt động sang lịch trình để thêm vào ngày đang chọn.</p>
      <ul
        ref={(element) => {
          poolDrop.ref(element);
          dnd.registerList('POOL', element);
        }}
        className={styles.poolList}
        data-draft-list="POOL"
        data-insertion-slot={dnd.intent?.container === 'POOL' ? dnd.intent.index : undefined}
        aria-label="Hoạt động chưa xếp lịch"
      >
        {items.map((activity, index) => (
          <PoolCard
            key={activity.id}
            activity={activity}
            index={index}
            canEdit={canEdit}
            dnd={dnd}
            onEdit={(trigger) => onEdit(activity, trigger)}
          />
        ))}
        {!items.length && (
          <li className={styles.poolEmpty}>
            <strong>Không có hoạt động phù hợp</strong>
            <span>
              {query
                ? 'Thử từ khóa khác.'
                : 'Chọn địa điểm ở trang bản đồ hoặc kéo hoạt động từ lịch trình vào đây.'}
            </span>
          </li>
        )}
      </ul>
      <div className={styles.localNotice} role="status">
        <strong>Chỉ lưu trên thiết bị này</strong>
        <span>Chưa đồng bộ với thành viên khác · Nháp hết hạn sau 30 ngày.</span>
      </div>
    </section>
  );
}

function ActivityEditor({
  activity,
  latest,
  locationName,
  days,
  timezone,
  tripStartAt,
  tripEndAt,
  onSave,
  onDismiss,
}: {
  activity: PlanDraftActivity | null;
  latest: PlanDraftActivity | undefined;
  locationName: string;
  days: readonly string[];
  timezone: string;
  tripStartAt: string;
  tripEndAt: string;
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
    const validation = validatePlanDraftEdit({
      title,
      day,
      startTime,
      endTime,
      allowedDays: days,
      timezone,
      tripStartAt,
      tripEndAt,
    });
    setError(validation);
    if (validation) return;
    setSaving(true);
    try {
      const saved = await onSave(
        { activityId: activity.id, title, day, startTime, endTime, timezone },
        baseline,
      );
      if (!saved) setSaveConflict(true);
    } finally {
      setSaving(false);
    }
  };
  return (
    <PlannerDialog
      open
      className={styles.editorDialog}
      label="Chỉnh sửa hoạt động"
      initialFocusRef={titleRef}
      onDismiss={onDismiss}
    >
      <form onSubmit={(event) => void submit(event)} noValidate>
        <header className={styles.dialogHeader}>
          <div>
            <p>Chỉ lưu trên thiết bị này</p>
            <h2>Chỉnh sửa hoạt động</h2>
          </div>
          <button type="button" onClick={onDismiss} aria-label="Đóng chỉnh sửa hoạt động">
            ×
          </button>
        </header>
        <div className={styles.editorFields}>
          {error && <Alert live>{error}</Alert>}
          {conflict && (
            <Alert tone="warning" live>
              Hoạt động đã thay đổi ở tab khác hoặc không còn trong bản nháp. Nội dung bạn đang nhập
              vẫn được giữ. Hãy nạp bản mới hoặc hủy chỉnh sửa.
            </Alert>
          )}
          <Input
            ref={titleRef}
            label="Tên hoạt động"
            required
            maxLength={255}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={error?.startsWith('Tên hoạt động') ? error : undefined}
          />
          <Select label="Ngày" value={day} onChange={(event) => setDay(event.target.value)}>
            {days.map((value, index) => (
              <option key={value} value={value}>
                Ngày {index + 1} · {value.slice(8, 10)}/{value.slice(5, 7)}/{value.slice(0, 4)}
              </option>
            ))}
          </Select>
          <div className={styles.timeFields}>
            <Input
              label="Giờ bắt đầu"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
            <Input
              label="Giờ kết thúc"
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </div>
          <Input label="Địa điểm" value={locationName} readOnly />
        </div>
        <footer className={styles.dialogActions}>
          <Button variant="outline" onClick={onDismiss}>
            Hủy
          </Button>
          {conflict && (
            <Button variant="outline" disabled={!latest || saving} onClick={reload}>
              Nạp bản mới
            </Button>
          )}
          <Button type="submit" disabled={conflict || saving}>
            Lưu thay đổi
          </Button>
        </footer>
      </form>
    </PlannerDialog>
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
  dnd,
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
  dnd: PreviewDndControls;
}) {
  const timeline = (
    <section
      className={styles.timeline}
      aria-labelledby={compact ? 'planner-day-title' : 'plan-day-title'}
    >
      <div className={styles.toolbar}>
        <h2 id={compact ? 'planner-day-title' : 'plan-day-title'}>
          Lịch trình ngày {planDays(trip.startAt, trip.endAt, trip.timezone).indexOf(day) + 1}
        </h2>
        <span className={styles.progress}>
          {items.filter((a) => a.status === 'COMPLETED').length}/{items.length} hoàn thành
        </span>
        <Button variant="outline" disabled title="Bản đồ chưa khả dụng trong Preview">
          Hiện bản đồ
        </Button>
        <Button aria-pressed onClick={() => closeRef.current?.focus()}>
          Thêm hoạt động
        </Button>
      </div>
      <TimelineList
        items={items}
        day={day}
        timezone={trip.timezone}
        canEdit={plan.permissions.canEdit}
        dragEnabled={plan.permissions.canEdit}
        onEdit={onEdit}
        dnd={dnd}
      />
    </section>
  );
  const pool = (
    <ActivityPool
      items={poolItems}
      canEdit={plan.permissions.canEdit}
      query={query}
      onQueryChange={onQueryChange}
      storageStatus={storageStatus}
      onClose={onClose}
      closeRef={closeRef}
      dnd={dnd}
      onEdit={onEdit}
    />
  );
  if (!compact)
    return (
      <div className={`${styles.columns} ${styles.withPlanner}`}>
        {timeline}
        {pool}
      </div>
    );
  return (
    <PlannerDialog
      open
      className={styles.plannerDialog}
      label="Thêm hoạt động vào lịch trình"
      initialFocusRef={closeRef}
      onDismiss={onClose}
    >
      <div className={styles.plannerDialogHeader}>
        <div>
          <p>Chỉ lưu trên thiết bị này</p>
          <h2>Thêm hoạt động vào lịch trình</h2>
        </div>
      </div>
      <div className={styles.plannerDialogBody}>
        {pool}
        {timeline}
      </div>
    </PlannerDialog>
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
}) {
  const days = planDays(trip.startAt, trip.endAt, trip.timezone);
  const day = selectedDay && days.includes(selectedDay) ? selectedDay : days[0]!;
  const items = draftActivitiesForDay(activities, day);
  const allPoolItems = unscheduledDraftActivities(activities);
  const [query, setQuery] = useState('');
  const dnd = usePreviewDnd({
    activities,
    day,
    canEdit: plan.permissions.canEdit,
    plannerOpen,
    openPlanner: onPlannerOpen,
    onMove,
    revealPoolItem: () => setQuery(''),
  });
  const [editing, setEditing] = useState<PlanDraftActivity | null>(null);
  const editReturnFocus = useRef<HTMLButtonElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const compact = useCompactPlanner();
  useEffect(() => {
    if (editing !== null || !editReturnFocus.current) return;
    // Wait for the closing render to remove the modal before focusing outside
    // it. A requestAnimationFrame from an async save can precede that commit.
    const target = editReturnFocus.current.isConnected
      ? editReturnFocus.current
      : addButtonRef.current;
    target?.focus();
    editReturnFocus.current = null;
  }, [editing]);
  const normalizedQuery = query.trim().toLocaleLowerCase('vi');
  const poolItems = allPoolItems.filter((activity) =>
    `${activity.title} ${activity.description ?? ''}`
      .toLocaleLowerCase('vi')
      .includes(normalizedQuery),
  );
  const locationMap = useMemo(
    () => new Map(plan.selectedLocations.map((location) => [location.id, location])),
    [plan.selectedLocations],
  );
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
  return (
    <>
      <div className={styles.hero}>
        <TripHero trip={trip} compact variant="landscape" />
      </div>
      {storageStatus === 'memory' && (
        <Alert tone="warning" live>
          Không thể lưu vào trình duyệt. Bản nháp chỉ được giữ trong bộ nhớ của tab này và sẽ mất
          khi tải lại hoặc đóng tab.
        </Alert>
      )}
      <div className={styles.days} role="group" aria-label="Ngày trong lịch trình">
        {days.map((date, index) => (
          <button
            key={date}
            type="button"
            aria-pressed={date === day}
            onClick={() => onDayChange(date)}
          >
            Ngày {index + 1}
            <small>
              {date.slice(8, 10)}/{date.slice(5, 7)}
            </small>
          </button>
        ))}
        <Button variant="outline" disabled>
          + Thêm ngày
        </Button>
      </div>
      <PlanMetrics trip={trip} plan={{ ...plan, activities }} day={day} />
      <DragDropProvider
        sensors={[PointerSensor]}
        plugins={(defaults) => [
          ...defaults,
          Accessibility.configure({
            screenReaderInstructions: {
              draggable:
                'Nhấn Enter hoặc phím cách để bắt đầu kéo. Dùng các phím mũi tên để di chuyển, Enter để thả và Escape để hủy.',
            },
            announcements: {
              dragstart: ({ operation }: DragStartEvent) =>
                `Đã bắt đầu kéo ${String(operation.source?.data.label ?? 'hoạt động')}.`,
              dragover: ({ operation }: DragOverEvent) =>
                operation.target
                  ? `Đang ở ${String(operation.target.data.label ?? 'vùng thả')}.`
                  : undefined,
              dragend: ({ operation }: DragEndEvent) =>
                operation.canceled
                  ? 'Đã hủy kéo thả.'
                  : `Đã thả ${String(operation.source?.data.label ?? 'hoạt động')}.`,
            },
          }),
        ]}
        onDragStart={dnd.onDragStart}
        onDragMove={dnd.onDragMove}
        onDragEnd={dnd.onDragEnd}
      >
        {!plannerOpen && (
          <div className={styles.columns}>
            <section className={styles.timeline} aria-labelledby="plan-day-title">
              <div className={styles.toolbar}>
                <h2 id="plan-day-title">Lịch trình ngày {days.indexOf(day) + 1}</h2>
                <span className={styles.progress}>
                  {items.filter((a) => a.status === 'COMPLETED').length}/{items.length} hoàn thành
                </span>
                <Button variant="outline" disabled>
                  Hiện bản đồ
                </Button>
                <Button ref={addButtonRef} onClick={onPlannerOpen}>
                  Thêm hoạt động
                </Button>
              </div>
              <TimelineList
                items={items}
                day={day}
                timezone={trip.timezone}
                canEdit={plan.permissions.canEdit}
                dragEnabled={plan.permissions.canEdit}
                onEdit={beginEdit}
                dnd={dnd}
              />
            </section>
          </div>
        )}
        {plannerOpen && (
          <PlannerWorkspace
            trip={trip}
            plan={plan}
            day={day}
            items={items}
            poolItems={poolItems}
            query={query}
            onQueryChange={setQuery}
            storageStatus={storageStatus}
            compact={compact}
            closeRef={closeRef}
            onClose={closePlanner}
            onEdit={beginEdit}
            dnd={dnd}
          />
        )}
        <DragOverlay dropAnimation={null}>
          {dnd.draggingId && (
            <div className={styles.dragOverlay}>
              {activities.find((activity) => activity.id === dnd.draggingId)?.title}
            </div>
          )}
        </DragOverlay>
      </DragDropProvider>
      <span className={styles.srOnly} role="status" aria-live="polite">
        {dnd.announcement}
      </span>
      <ActivityEditor
        key={editing?.id ?? 'closed'}
        activity={editing}
        latest={activities.find((activity) => activity.id === editing?.id)}
        locationName={
          (editing?.selectedLocationId && locationMap.get(editing.selectedLocationId)?.name) ||
          'Chưa có địa điểm'
        }
        days={days}
        timezone={trip.timezone}
        tripStartAt={trip.startAt}
        tripEndAt={trip.endAt}
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
  const repository = usePlanRepository();
  return (
    <MotionProvider>
      {repository.createActivity ? <GatewayPlanPage /> : <PreviewPlanPage />}
    </MotionProvider>
  );
}
function GatewayPlanPage() {
  const { tripId = '' } = useParams();
  const snapshot = useTripPlanSnapshot(tripId, 'success');
  return (
    <section className={styles.page} data-flow="plan-server">
      <div className={styles.breadcrumb}>
        <Link to={paths.trip(tripId)}>Tổng quan chuyến đi</Link>
        <span>›</span>
        <h1>Lịch trình</h1>
      </div>
      {snapshot.state.status === 'ready' ? (
        <>
          <TripHero trip={snapshot.state.trip} compact variant="landscape" />
          <GatewayPlanPanel
            key={`${tripId}:${snapshot.state.trip.currentMembership.id}`}
            trip={snapshot.state.trip}
            plan={snapshot.state.plan}
            refresh={snapshot.retry}
            onBusyChange={() => undefined}
          />
        </>
      ) : snapshot.state.status === 'error' ? (
        <ContentState state="error" error={snapshot.state.error} onRetry={snapshot.retry} />
      ) : (
        <ContentState state={snapshot.state.status === 'loading' ? 'loading' : 'empty'} />
      )}
    </section>
  );
}
function PreviewPlanPage() {
  const { tripId = '' } = useParams();
  const { previewEnabled } = useOutletContext<RouteContext>();
  const [scenario, setScenario] = useState<PlanScenario>('success');
  const [day, setDay] = useState<string | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [commandState, setCommandState] = useState('idle');
  const repository = usePlanRepository();
  const gateway = !!repository.createActivity;
  const [localView, setLocalView] = useState(!gateway);
  const [gatewayBusy, setGatewayBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const snapshot = useTripPlanSnapshot(tripId, scenario);
  const trip = snapshot.state.status === 'ready' ? snapshot.state.trip : null;
  const plan = snapshot.state.status === 'ready' ? snapshot.state.plan : null;
  const userId = trip?.currentMembership.userId ?? '';
  const localSelection = usePlaceSelection(userId, tripId);
  const effectivePlan = useMemo(
    () =>
      plan
        ? {
            ...plan,
            selectedLocations: mergePlaceSelections(
              plan.selectedLocations,
              plan.activities,
              localSelection,
            ),
          }
        : null,
    [localSelection, plan],
  );
  const draft = usePlanDraft({
    userId,
    tripId,
    plan: effectivePlan,
    locations: effectivePlan?.selectedLocations ?? [],
    timezone: trip?.timezone ?? 'UTC',
  });
  const error = snapshot.state.status === 'error' ? snapshot.state.error : null;
  return (
    <section
      className={styles.page}
      data-flow="plan-preview"
      data-local-draft="true"
      data-node-id="20:236"
    >
      <div className={styles.breadcrumb}>
        <Link to={paths.trip(tripId)}>Tổng quan chuyến đi</Link>
        <span aria-hidden="true">›</span>
        <h1>Lịch trình</h1>
      </div>
      {error ? (
        <ContentState
          state={error.code === 'SERVICE_UNAVAILABLE' && !error.retryable ? 'unavailable' : 'error'}
          error={error}
          headingLevel={2}
          onRetry={snapshot.retry}
        />
      ) : snapshot.state.status === 'loading' ? (
        <ContentState state="loading" headingLevel={2} />
      ) : trip && effectivePlan ? (
        <>
          {gateway && (
            <div>
              <Button
                variant={localView ? 'outline' : 'primary'}
                disabled={gatewayBusy}
                onClick={() => setLocalView(false)}
              >
                Lịch trình chung
              </Button>
              <Button
                variant={localView ? 'primary' : 'outline'}
                disabled={gatewayBusy}
                onClick={() => setLocalView(true)}
              >
                Bản nháp trên thiết bị
              </Button>
            </div>
          )}
          {gateway && plan && (
            <div hidden={localView}>
              <GatewayPlanPanel
                key={`${trip.id}:${trip.currentMembership.id}`}
                trip={trip}
                plan={plan}
                refresh={snapshot.retry}
                onBusyChange={setGatewayBusy}
              />
            </div>
          )}
          {localView && (
            <>
              {gateway && (
                <Alert>
                  Bản nháp chỉ lưu trên thiết bị này, chưa đồng bộ với nhóm. Kéo thả giữ ngày và xóa
                  giờ từ vị trí chèn trở xuống.
                </Alert>
              )}
              {draft.needsReview && (
                <Alert tone="warning">
                  Lịch trình chung đã thay đổi. Bản nháp được giữ nguyên để đối chiếu; chưa thể sửa
                  tiếp.
                </Alert>
              )}
              {(gateway || draft.needsReview) && (
                <Button variant="outline" onClick={() => setConfirmReset(true)}>
                  Thay bản nháp bằng lịch trình chung
                </Button>
              )}
              {confirmReset && (
                <Alert tone="warning">
                  Bỏ bản nháp trên thiết bị và lấy dữ liệu server hiện tại?
                  <Button
                    onClick={async () => {
                      await draft.resetToServer();
                      setConfirmReset(false);
                    }}
                  >
                    Xác nhận bỏ bản nháp
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmReset(false)}>
                    Giữ bản nháp
                  </Button>
                </Alert>
              )}
              <PlanView
                trip={trip}
                plan={
                  draft.needsReview || gatewayBusy || trip.lifecycle === 'ARCHIVED'
                    ? {
                        ...effectivePlan,
                        permissions: { ...effectivePlan.permissions, canEdit: false },
                      }
                    : effectivePlan
                }
                activities={draft.activities}
                selectedDay={day}
                onDayChange={setDay}
                plannerOpen={plannerOpen}
                onPlannerOpen={() => setPlannerOpen(true)}
                onPlannerClose={() => setPlannerOpen(false)}
                storageStatus={draft.storageStatus}
                onMove={draft.move}
                onEdit={draft.edit}
              />
            </>
          )}
        </>
      ) : (
        <ContentState state="empty" headingLevel={2} />
      )}
      {previewEnabled && (
        <details className="preview" data-preview="plan">
          <summary>Plan preview · Dữ liệu minh họa</summary>
          {trip && plan && (
            <p className={styles.revisions}>
              Plan {plan.planVersion} · Membership {trip.membershipRevision} · Export{' '}
              {plan.exportRevision} ·{' '}
              {plan.permissions.canEdit
                ? 'Có quyền sửa lịch trình'
                : 'Không có quyền sửa lịch trình'}{' '}
              · {plan.permissions.canComplete ? 'Có quyền hoàn tất' : 'Không có quyền hoàn tất'}
            </p>
          )}
          <Select
            label="Trạng thái lịch trình"
            value={scenario}
            onChange={(event) => {
              const next = planScenarios.find((value) => value === event.target.value);
              if (next) setScenario(next);
            }}
          >
            {planScenarios.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
          <Select
            label="Trạng thái thao tác preview"
            value={commandState}
            onChange={(event) => setCommandState(event.target.value)}
          >
            {['idle', 'pending', 'unknown'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
          {commandState !== 'idle' && (
            <Alert live>
              {commandState === 'pending'
                ? 'Minh họa đang xử lý · Không có request đang gửi.'
                : 'Minh họa kết quả chưa xác định · Chưa xác nhận thay đổi hoặc tăng phiên bản.'}
            </Alert>
          )}
        </details>
      )}
    </section>
  );
}
