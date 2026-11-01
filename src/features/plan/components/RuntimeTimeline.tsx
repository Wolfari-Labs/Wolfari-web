import { useRef, useState, type ReactNode } from 'react';
import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/react';
import { TimelineKeyboardSensor } from './TimelineKeyboardSensor';
import { Accessibility, PointerSensor } from '@dnd-kit/dom';
import { useReducedMotion } from 'motion/react';
import type { ActivityViewModel, PlanViewModel, SelectedLocationViewModel } from '../model/plan';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import { localDate, planDays } from '../model/plan-presentation';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Icon } from '../../../shared/components/Icon';
import { ActionMenu } from '../../../shared/components/Ui';
import { SplitPanel } from '../../../shared/components/SplitPanel';
import { TimelineCard } from './TimelineCard';
import { PlanMetrics } from './PlanMetrics';
import { PlanDayMap } from './PlanDayMap';
import mountain from '../../../shared/assets/figma/eb8f3.svg';
import meal from '../../../shared/assets/figma/41563.svg';
import beach from '../../../shared/assets/figma/e9568.svg';
import walk from '../../../shared/assets/figma/9c64a.svg';
import styles from './RuntimeTimeline.module.css';
const activityIcons: Record<string, string> = {
  SIGHTSEEING: mountain,
  MEAL: meal,
  BEACH: beach,
  WALK: walk,
};
const activityDay = (a: ActivityViewModel, timezone: string) =>
  a.startsAt ? localDate(a.startsAt, timezone) : (a.scheduledDate ?? 'POOL');
const formatClock = (value: string, timezone: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
function DayTarget({
  day,
  label,
  selected,
  dropDisabled,
  onClick,
}: {
  day: string;
  label: string;
  selected: boolean;
  dropDisabled: boolean;
  onClick: () => void;
}) {
  const drop = useDroppable({
    id: `day:${day}`,
    data: { day, label },
    disabled: dropDisabled || day === 'ALL',
  });
  return (
    <Button
      ref={drop.ref}
      data-plan-day={day !== 'ALL' ? day : undefined}
      variant={selected ? 'primary' : 'outline'}
      aria-pressed={selected}
      data-drop-target={drop.isDropTarget || undefined}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
function ActivityRow({
  activity,
  trip,
  plan,
  disabled,
  editable,
  completable,
  onEdit,
  onDelete,
  onComplete,
  onMove,
  index,
  length,
}: {
  activity: ActivityViewModel;
  trip: TripDetailViewModel;
  plan: PlanViewModel;
  disabled: boolean;
  editable: boolean;
  completable: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onMove: (offset: number) => void;
  index: number;
  length: number;
}) {
  const drag = useDraggable({
    id: activity.id,
    data: { label: activity.title },
    disabled: !editable || disabled,
  });
  const drop = useDroppable({
    id: `activity:${activity.id}`,
    data: { activityId: activity.id, label: activity.title },
    disabled: !editable || disabled,
  });
  const time = activity.startsAt
    ? `${localDate(activity.startsAt, trip.timezone)} · ${formatClock(activity.startsAt, trip.timezone)}${activity.endsAt ? ' – ' + (localDate(activity.endsAt, trip.timezone) !== localDate(activity.startsAt, trip.timezone) ? localDate(activity.endsAt, trip.timezone) + ' · ' : '') + formatClock(activity.endsAt, trip.timezone) : ''}`
    : activity.scheduledDate
      ? activity.scheduledDate + ' · Chưa xếp giờ'
      : 'Chưa xếp lịch';
  return (
    <li
      data-plan-activity={activity.id}
      data-activity-day={activityDay(activity, trip.timezone)}
      ref={(el) => {
        drag.ref(el);
        drop.ref(el);
      }}
      aria-label={activity.title}
      data-dragging={drag.isDragging || undefined}
      data-drop-target={drop.isDropTarget || undefined}
      className={styles.row}
    >
      <TimelineCard
        compact
        title={activity.title}
        description={activity.description}
        time={time}
        completed={activity.status === 'COMPLETED'}
        location={
          plan.selectedLocations.find((p) => p.id === activity.selectedLocationId)?.name ?? null
        }
        cover={activity.presentation.cover}
        typeIcon={activityIcons[activity.activityType] ?? null}
        handle={
          <Button
            ref={drag.handleRef}
            hidden={!editable}
            variant="ghost"
            size="icon"
            disabled={!editable || disabled}
            className={styles.handle}
            aria-label={`Kéo hoạt động ${activity.title}`}
          >
            <Icon name="grip" />
          </Button>
        }
        actions={
          <>
            {completable && (
              <Button
                variant="ghost"
                disabled={disabled}
                onClick={onComplete}
                icon={<Icon name="check" size={16} />}
              >
                {activity.status === 'TODO' ? 'Hoàn tất' : 'Mở lại'}
              </Button>
            )}
            {editable && (
              <>
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={(event) => {
                    event.currentTarget.focus();
                    onEdit();
                  }}
                >
                  Sửa
                </Button>
                <ActionMenu
                  label={`Thao tác ${activity.title}`}
                  items={[
                    { label: 'Di chuyển sang ngày khác', action: onEdit, disabled },
                    {
                      label: 'Đưa lên',
                      action: () => onMove(-1),
                      disabled: disabled || index === 0,
                    },
                    {
                      label: 'Đưa xuống',
                      action: () => onMove(1),
                      disabled: disabled || index === length - 1,
                    },
                    { label: 'Xóa', action: onDelete, disabled, danger: true },
                  ]}
                />
              </>
            )}
          </>
        }
      />
    </li>
  );
}
export function RuntimeTimeline({
  trip,
  plan,
  disabled,
  canEdit,
  onEdit,
  onDelete,
  onComplete,
  onMove,
  onReorder,
  onDay,
  onCreateFromLocation,
  actions,
  feedback,
}: {
  trip: TripDetailViewModel;
  plan: PlanViewModel;
  disabled: boolean;
  canEdit: boolean;
  onEdit: (a: ActivityViewModel) => void;
  onDelete: (a: ActivityViewModel) => void;
  onComplete: (a: ActivityViewModel) => void;
  onMove: (id: string, offset: number) => void;
  onReorder: (ids: string[]) => void;
  onDay: (a: ActivityViewModel, day: string) => void;
  onCreateFromLocation?: (location: SelectedLocationViewModel) => void;
  actions?: ReactNode;
  feedback?: ReactNode;
}) {
  const [day, setDay] = useState('ALL'),
    [sidePanel, setSidePanel] = useState<'none' | 'pool' | 'map'>('none'),
    [poolQuery, setPoolQuery] = useState(''),
    [dragging, setDragging] = useState<string | null>(null);
  const mapTrigger = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion(),
    days = planDays(trip.startAt, trip.endAt, trip.timezone),
    items = [...plan.activities].sort(
      (a, b) => a.position - b.position || a.id.localeCompare(b.id),
    );
  const row = (activity: ActivityViewModel) => (
    <ActivityRow
      key={activity.id}
      activity={activity}
      trip={trip}
      plan={plan}
      disabled={disabled}
      editable={canEdit}
      completable={
        trip.archivedAt === null &&
        trip.lifecycle !== 'ARCHIVED' &&
        !trip.currentMembership.leftAt &&
        plan.permissions.canComplete &&
        (activity.status === 'TODO' ||
          canEdit ||
          activity.completedByUserId === trip.currentMembership.userId)
      }
      onEdit={() => onEdit(activity)}
      onDelete={() => onDelete(activity)}
      onComplete={() => onComplete(activity)}
      onMove={(offset) => onMove(activity.id, offset)}
      index={items.indexOf(activity)}
      length={items.length}
    />
  );
  const visible = items.filter(
    (a) =>
      (day === 'ALL' || activityDay(a, trip.timezone) === day) &&
      (sidePanel !== 'pool' || activityDay(a, trip.timezone) !== 'POOL'),
  );
  const scheduledLocationIds = new Set(
    items
      .filter((activity) => activityDay(activity, trip.timezone) !== 'POOL')
      .map((activity) => activity.selectedLocationId)
      .filter((id): id is string => id !== null),
  );
  const normalizedQuery = poolQuery.trim().toLocaleLowerCase('vi');
  const poolLocations = plan.selectedLocations.filter(
    (location) =>
      !scheduledLocationIds.has(location.id) &&
      `${location.name} ${location.address ?? ''}`
        .toLocaleLowerCase('vi')
        .includes(normalizedQuery),
  );
  const poolActivities = items.filter(
    (activity) =>
      activityDay(activity, trip.timezone) === 'POOL' &&
      `${activity.title} ${activity.description ?? ''}`
        .toLocaleLowerCase('vi')
        .includes(normalizedQuery),
  );
  const timelineTitle =
    day === 'ALL'
      ? 'Lịch trình chung'
      : day === 'POOL'
        ? 'Hoạt động chưa xếp ngày'
        : `Lịch trình ngày ${days.indexOf(day) + 1}`;
  const timeline = (
    <section className={styles.surface}>
      <div className={styles.timelineHeader}>
        <div>
          <h2>{timelineTitle}</h2>
          <span className={styles.progress}>
            {visible.filter((activity) => activity.status === 'COMPLETED').length}/{visible.length}{' '}
            hoàn tất
          </span>
        </div>
        <div className={styles.timelineActions}>
          <Button
            ref={mapTrigger}
            variant="outline"
            aria-pressed={sidePanel === 'map'}
            onClick={() => setSidePanel(sidePanel === 'map' ? 'none' : 'map')}
          >
            {sidePanel === 'map' ? 'Ẩn bản đồ' : 'Hiện bản đồ'}
          </Button>
          <Button
            variant="outline"
            aria-pressed={sidePanel === 'pool'}
            onClick={() => {
              setSidePanel(sidePanel === 'pool' ? 'none' : 'pool');
              if (day === 'POOL') setDay('ALL');
            }}
          >
            {sidePanel === 'pool' ? 'Ẩn danh sách' : 'Sắp xếp lịch trình'}
          </Button>
          {actions}
        </div>
      </div>
      {feedback}
      {canEdit && (
        <p className={styles.help}>
          Kéo thẻ để đổi thứ tự, thả vào ngày để chuyển lịch. Giờ không tự thay đổi; hoạt động có
          giờ sẽ cần xác nhận.
        </p>
      )}
      <ol className={styles.list}>{visible.map(row)}</ol>
      {!visible.length && <p className={styles.empty}>Chưa có hoạt động trong nhóm này.</p>}
    </section>
  );
  const pool = (
    <section className={styles.surface} aria-label="Địa điểm và hoạt động chưa xếp ngày">
      <div className={styles.poolHeader}>
        <h2>Đã chọn · Chưa xếp lịch</h2>
        <span>
          {poolLocations.length} địa điểm · {poolActivities.length} hoạt động
        </span>
      </div>
      <Input
        label="Tìm trong địa điểm và hoạt động chưa xếp"
        type="search"
        value={poolQuery}
        onChange={(event) => setPoolQuery(event.target.value)}
      />
      <div className={styles.poolGroup}>
        <h3>Địa điểm đã chọn · chưa xếp</h3>
        {poolLocations.length ? (
          <ul className={styles.placeList}>
            {poolLocations.map((location) => (
              <li key={location.id}>
                <div>
                  <strong>{location.name}</strong>
                  <small>{location.address ?? 'Chưa có địa chỉ'}</small>
                </div>
                {canEdit && onCreateFromLocation && (
                  <Button
                    variant="outline"
                    size="compact"
                    disabled={disabled}
                    onClick={() => onCreateFromLocation(location)}
                  >
                    Thêm vào lịch
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Không có địa điểm phù hợp chưa xếp lịch.</p>
        )}
      </div>
      <div className={styles.poolGroup}>
        <h3>Hoạt động chưa xếp ngày</h3>
        <DayTarget
          day="POOL"
          label="Đưa về nhóm chưa xếp ngày"
          selected={false}
          dropDisabled={!canEdit || disabled}
          onClick={() => {
            setDay('POOL');
            setSidePanel('none');
          }}
        />
        {poolActivities.length ? (
          <ol className={styles.list}>{poolActivities.map(row)}</ol>
        ) : (
          <p className={styles.empty}>Không có hoạt động phù hợp chưa xếp ngày.</p>
        )}
      </div>
    </section>
  );
  return (
    <DragDropProvider
      sensors={[PointerSensor, TimelineKeyboardSensor]}
      plugins={(defaults) => [
        ...defaults,
        Accessibility.configure({
          screenReaderInstructions: {
            draggable:
              'Nhấn Enter để kéo, dùng mũi tên lên xuống để chọn thẻ, trái phải để chọn ngày, Enter để thả, Escape để hủy. Có thể dùng menu Di chuyển thay thế.',
          },
        }),
      ]}
      onDragStart={(event) => setDragging(String(event.operation.source?.id ?? ''))}
      onDragEnd={(event) => {
        setDragging(null);
        const { source, target, canceled } = event.operation;
        if (canceled || !source || !target || disabled || !canEdit) return;
        const activity = items.find((a) => a.id === source.id);
        if (!activity) return;
        const targetDay = target.data.day as string | undefined,
          targetActivity = items.find((a) => a.id === target.data.activityId);
        const destination =
          targetDay ?? (targetActivity ? activityDay(targetActivity, trip.timezone) : null);
        if (
          destination &&
          destination !== 'ALL' &&
          activityDay(activity, trip.timezone) !== destination
        ) {
          onDay(activity, destination);
          return;
        }
        if (targetActivity && activity.id !== targetActivity.id) {
          const ids = items.map((a) => a.id),
            from = ids.indexOf(activity.id),
            to = ids.indexOf(targetActivity.id);
          ids.splice(from, 1);
          ids.splice(to, 0, activity.id);
          onReorder(ids);
        }
      }}
    >
      <div data-runtime-timeline className={styles.workspace}>
        <div className={styles.days} role="group" aria-label="Ngày trong lịch trình">
          {days.map((d, index) => (
            <DayTarget
              key={d}
              day={d}
              label={`Ngày ${index + 1} · ${d.slice(8)}/${d.slice(5, 7)}`}
              selected={day === d}
              dropDisabled={!canEdit || disabled}
              onClick={() => setDay(d)}
            />
          ))}
          <span className={styles.dayUtilities}>
            {(['ALL', 'POOL'] as const).map((d) => (
              <DayTarget
                key={d}
                day={d}
                label={d === 'ALL' ? 'Tất cả' : 'Chưa chọn ngày'}
                selected={day === d}
                dropDisabled={!canEdit || disabled}
                onClick={() => {
                  setDay(d);
                  if (d === 'POOL') setSidePanel('none');
                }}
              />
            ))}
          </span>
        </div>
        <PlanMetrics trip={trip} plan={plan} day={day} />
        {sidePanel !== 'none' ? (
          <SplitPanel
            key={sidePanel}
            storageKey={`wolfari:ui:plan-${sidePanel}-split`}
            primary={timeline}
            secondary={
              sidePanel === 'pool' ? (
                pool
              ) : (
                <PlanDayMap
                  trip={trip}
                  plan={plan}
                  day={day}
                  onClose={() => {
                    setSidePanel('none');
                    mapTrigger.current?.focus();
                  }}
                />
              )
            }
            secondaryLabel={sidePanel === 'map' ? 'Bản đồ lịch trình' : 'Hoạt động chưa xếp ngày'}
            initialSecondaryOpen={sidePanel === 'map'}
            {...(sidePanel === 'map'
              ? {
                  onSecondaryDismiss: () => {
                    setSidePanel('none');
                    mapTrigger.current?.focus();
                  },
                }
              : {})}
          />
        ) : (
          timeline
        )}
      </div>
      <DragOverlay dropAnimation={reduced ? null : { duration: 180, easing: 'ease-out' }}>
        {dragging && (
          <div className={styles.overlay}>
            <Icon name="grip" />
            <strong>{items.find((a) => a.id === dragging)?.title}</strong>
          </div>
        )}
      </DragOverlay>
    </DragDropProvider>
  );
}
