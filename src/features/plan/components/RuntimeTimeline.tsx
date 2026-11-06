import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/react';
import { Accessibility, PointerSensor } from '@dnd-kit/dom';
import { useReducedMotion } from 'motion/react';
import type { ActivityViewModel, PlanViewModel, SelectedLocationViewModel } from '../model/plan';
import type { GatewayPlanMove } from '../model/plan-arrangement';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';
import { localDate, planDays } from '../model/plan-presentation';
import {
  gatewayActivityDay,
  gatewayDragKey,
  useGatewayDnd,
  type GatewayDndControls,
} from '../hooks/use-gateway-dnd';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Icon } from '../../../shared/components/Icon';
import { Drawer } from '../../../shared/components/Drawer';
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
import dragIcon from '../../../shared/assets/figma/56e25.svg';
import moreIcon from '../../../shared/assets/figma/ca9fb.svg';

const activityIcons: Record<string, string> = {
  SIGHTSEEING: mountain,
  MEAL: meal,
  BEACH: beach,
  WALK: walk,
};
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
  disabled,
  dnd,
  onClick,
}: {
  day: string;
  label: string;
  selected: boolean;
  disabled: boolean;
  dnd: GatewayDndControls;
  onClick: () => void;
}) {
  const targetDay = day === 'POOL' ? null : day;
  const drop = useDroppable({ id: `day:${day}`, disabled: disabled || day === 'ALL' });
  return (
    <Button
      ref={(element) => {
        drop.ref(element);
        if (day !== 'ALL') dnd.registerDay(targetDay, element);
      }}
      data-plan-day={day !== 'ALL' ? day : undefined}
      variant={selected ? 'primary' : 'outline'}
      aria-pressed={selected}
      data-drop-target={dnd.intent?.target.day === targetDay || undefined}
      onClick={onClick}
    >
      {day !== 'ALL' && day !== 'POOL' ? (
        <span>
          {label.split(' · ')[0]} ·<small>{label.split(' · ')[1]}</small>
        </span>
      ) : (
        label
      )}
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
  showDate,
  inPool = false,
  dnd,
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
  showDate: boolean;
  inPool?: boolean;
  dnd: GatewayDndControls;
}) {
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const edit = () => {
    menuTrigger.current?.focus();
    onEdit();
  };
  const source: GatewayPlanMove['source'] = { type: 'ACTIVITY', id: activity.id };
  const dragKey = gatewayDragKey(source);
  const drag = useDraggable({
    id: dragKey,
    data: { label: activity.title },
    disabled: !editable || disabled,
  });
  const time = activity.startsAt
    ? `${showDate ? localDate(activity.startsAt, trip.timezone) + ' · ' : ''}${formatClock(activity.startsAt, trip.timezone)}${activity.endsAt ? ' – ' + (localDate(activity.endsAt, trip.timezone) !== localDate(activity.startsAt, trip.timezone) ? localDate(activity.endsAt, trip.timezone) + ' · ' : '') + formatClock(activity.endsAt, trip.timezone) : ''}`
    : activity.scheduledDate
      ? (showDate ? activity.scheduledDate + ' · ' : '') + 'Chưa xếp giờ'
      : 'Chưa xếp lịch';
  const selectedLocation = plan.selectedLocations.find((p) => p.id === activity.selectedLocationId);
  const handle = (
    <Button
      ref={drag.handleRef}
      hidden={!editable}
      variant="ghost"
      size="icon"
      disabled={!editable || disabled}
      className={styles.handle}
      aria-label={`Kéo hoạt động ${activity.title}`}
      data-gateway-handle={dragKey}
      aria-pressed={dnd.draggingKey === dragKey}
      onKeyDown={(event) => dnd.onHandleKeyDown(source, event)}
    >
      <img src={dragIcon} alt="" />
    </Button>
  );
  const actions = (editable || completable) && (
    <ActionMenu
      triggerRef={menuTrigger}
      icon={<img src={moreIcon} alt="" />}
      label={`Thao tác ${activity.title}`}
      items={[
        ...(completable
          ? [
              {
                label: activity.status === 'TODO' ? 'Hoàn tất' : 'Mở lại',
                action: onComplete,
                disabled,
              },
            ]
          : []),
        ...(editable
          ? [
              { label: 'Chỉnh sửa hoạt động', action: edit, disabled },
              { label: 'Di chuyển sang ngày khác', action: edit, disabled },
              { label: 'Đưa lên', action: () => onMove(-1), disabled: disabled || index === 0 },
              {
                label: 'Đưa xuống',
                action: () => onMove(1),
                disabled: disabled || index === length - 1,
              },
              {
                label: 'Xóa',
                action: () => {
                  menuTrigger.current?.focus();
                  onDelete();
                },
                disabled,
                danger: true,
              },
            ]
          : []),
      ]}
    />
  );
  return (
    <li
      data-plan-activity={activity.id}
      data-activity-day={gatewayActivityDay(activity, trip.timezone) ?? 'POOL'}
      ref={drag.ref}
      aria-label={activity.title}
      data-dragging={dnd.draggingKey === dragKey || undefined}
      data-insert-before={dnd.intent?.beforeId === activity.id || undefined}
      data-insert-after={
        (dnd.intent?.beforeId === null && dnd.intent?.afterId === activity.id) || undefined
      }
      className={inPool ? styles.poolCard : styles.row}
    >
      {inPool ? (
        <>
          {handle}
          <span className={styles.poolIcon} aria-hidden="true">
            <img src={activityIcons[activity.activityType] ?? mountain} alt="" />
          </span>
          <div className={styles.poolCopy}>
            <strong>{activity.title}</strong>
            <small>{selectedLocation?.address ?? activity.description ?? 'Chưa có địa chỉ'}</small>
            <small>Chưa xếp lịch</small>
          </div>
          {activity.presentation.cover && (
            <img
              className={styles.poolCover}
              src={activity.presentation.cover.src}
              alt={activity.presentation.cover.alt}
            />
          )}
          {actions}
        </>
      ) : (
        <>
          <span className={styles.step} aria-hidden="true">
            {activity.status === 'COMPLETED' ? '✓' : index + 1}
          </span>
          <TimelineCard
            compact
            title={activity.title}
            description={activity.description}
            time={time}
            completed={activity.status === 'COMPLETED'}
            location={selectedLocation?.address ?? selectedLocation?.name ?? null}
            cover={activity.presentation.cover}
            typeIcon={activityIcons[activity.activityType] ?? null}
            handle={handle}
            actions={actions}
          />
        </>
      )}
    </li>
  );
}

function LocationRow({
  location,
  disabled,
  editable,
  dnd,
}: {
  location: SelectedLocationViewModel;
  disabled: boolean;
  editable: boolean;
  dnd: GatewayDndControls;
}) {
  const source: GatewayPlanMove['source'] = { type: 'LOCATION', id: location.id };
  const key = gatewayDragKey(source);
  const drag = useDraggable({
    id: key,
    data: { label: location.name },
    disabled: !editable || disabled,
  });
  return (
    <li
      ref={drag.ref}
      className={styles.poolCard}
      data-plan-location={location.id}
      aria-label={location.name}
      data-dragging={dnd.draggingKey === key || undefined}
    >
      <Button
        ref={drag.handleRef}
        hidden={!editable}
        variant="ghost"
        size="icon"
        className={styles.handle}
        disabled={disabled || !editable}
        data-gateway-handle={key}
        aria-label={`Kéo địa điểm ${location.name}`}
        aria-pressed={dnd.draggingKey === key}
        onKeyDown={(event) => dnd.onHandleKeyDown(source, event)}
      >
        <img src={dragIcon} alt="" />
      </Button>
      <span className={styles.poolIcon} aria-hidden="true">
        <Icon name="map" />
      </span>
      <div className={styles.poolCopy}>
        <strong>{location.name}</strong>
        <small>{location.address ?? 'Chưa có địa chỉ'}</small>
        <small>Chưa xếp lịch</small>
      </div>
    </li>
  );
}

function DropList({
  day,
  dnd,
  disabled,
  children,
  pool = false,
  empty = false,
  label,
}: {
  day: string | null;
  dnd: GatewayDndControls;
  disabled: boolean;
  children: ReactNode;
  pool?: boolean;
  empty?: boolean;
  label: string;
}) {
  const drop = useDroppable({ id: `list:${day ?? 'POOL'}`, disabled });
  const active = dnd.intent?.target.day === day;
  return (
    <ol
      ref={(element) => {
        drop.ref(element);
        dnd.registerList(day, element);
      }}
      className={pool ? styles.poolList : styles.list}
      data-gateway-list={day ?? 'POOL'}
      data-insertion-slot={active ? dnd.intent?.target.index : undefined}
      aria-label={label}
      tabIndex={0}
    >
      {children}
      <li
        className={styles.dropEnd}
        data-gateway-drop-end
        data-drop-active={(active && !dnd.intent?.beforeId) || undefined}
        data-empty={empty || undefined}
      >
        {empty
          ? pool
            ? 'Chưa có hoạt động phù hợp trong giỏ. Thả vào đây để bỏ ngày và giờ.'
            : 'Ngày chưa có hoạt động. Kéo hoạt động vào đây.'
          : 'Thả vào cuối danh sách'}
      </li>
    </ol>
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
  onArrange,
  actions,
  feedback,
  utilities,
}: {
  trip: TripDetailViewModel;
  plan: PlanViewModel;
  disabled: boolean;
  canEdit: boolean;
  onEdit: (a: ActivityViewModel) => void;
  onDelete: (a: ActivityViewModel) => void;
  onComplete: (a: ActivityViewModel) => void;
  onMove: (id: string, offset: number) => void;
  onArrange: (move: GatewayPlanMove) => Promise<boolean>;
  actions?: ReactNode;
  feedback?: ReactNode;
  utilities?: ReactNode;
}) {
  const days = planDays(trip.startAt, trip.endAt, trip.timezone);
  const [day, setDay] = useState(days[0] ?? 'ALL');
  const [sidePanel, setSidePanel] = useState<'none' | 'pool' | 'map'>('none');
  const [poolQuery, setPoolQuery] = useState('');
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 1201px)').matches);
  const mapTrigger = useRef<HTMLButtonElement>(null);
  const poolTrigger = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1201px)');
    const update = () => setWide(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const openPool = () => {
    setSidePanel('pool');
    setPoolQuery('');
    if (day === 'POOL') setDay(days[0] ?? 'ALL');
  };
  const dnd = useGatewayDnd({
    plan,
    timezone: trip.timezone,
    day,
    canEdit: canEdit && !disabled,
    poolOpen: sidePanel === 'pool',
    openPool,
    revealDay: setDay,
    onArrange,
  });
  const items = [...plan.activities].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );
  const row = (
    activity: ActivityViewModel,
    index: number,
    group: ActivityViewModel[],
    inPool = false,
  ) => (
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
      index={index}
      length={group.length}
      showDate={day === 'ALL'}
      inPool={inPool}
      dnd={dnd}
    />
  );
  const visible = items.filter(
    (a) =>
      (day === 'ALL' || (gatewayActivityDay(a, trip.timezone) ?? 'POOL') === day) &&
      (sidePanel !== 'pool' || gatewayActivityDay(a, trip.timezone) !== null),
  );
  const linkedLocationIds = new Set(items.map((activity) => activity.selectedLocationId));
  const normalizedQuery = poolQuery.trim().toLocaleLowerCase('vi');
  const poolLocations = plan.selectedLocations.filter(
    (location) =>
      !linkedLocationIds.has(location.id) &&
      `${location.name} ${location.address ?? ''}`
        .toLocaleLowerCase('vi')
        .includes(normalizedQuery),
  );
  const poolActivities = items.filter(
    (activity) =>
      gatewayActivityDay(activity, trip.timezone) === null &&
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
  const compactPool = sidePanel === 'pool' && !wide;
  const dayBar = (
    <div className={styles.days} role="group" aria-label="Ngày trong lịch trình">
      {days.map((value, index) => (
        <DayTarget
          key={value}
          day={value}
          label={`Ngày ${index + 1} · ${value.slice(8)}/${value.slice(5, 7)}`}
          selected={day === value}
          disabled={!canEdit || disabled}
          dnd={dnd}
          onClick={() => setDay(value)}
        />
      ))}
      <span className={styles.dayUtilities}>
        {(['ALL', 'POOL'] as const).map((value) => (
          <DayTarget
            key={value}
            day={value}
            label={value === 'ALL' ? 'Tất cả' : 'Chưa chọn ngày'}
            selected={day === value}
            disabled={!canEdit || disabled}
            dnd={dnd}
            onClick={() => {
              setDay(value);
              if (value === 'POOL') setSidePanel('none');
            }}
          />
        ))}
      </span>
    </div>
  );
  const timeline = (
    <section className={styles.timeline}>
      <div className={styles.timelineHeader}>
        <div>
          <h2>{timelineTitle}</h2>
          <span className={styles.progress}>
            {visible.filter((a) => a.status === 'COMPLETED').length}/{visible.length} hoàn tất
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
          {canEdit && (
            <Button
              ref={poolTrigger}
              icon={<Icon name="plus" />}
              disabled={disabled}
              aria-pressed={sidePanel === 'pool'}
              onClick={openPool}
            >
              Thêm hoạt động
            </Button>
          )}
          <details className={styles.tools}>
            <summary aria-label="Tùy chọn lịch trình">
              <img src={moreIcon} alt="" />
            </summary>
            <div>
              {actions}
              {!compactPool && utilities}
              {!canEdit && sidePanel !== 'pool' && (
                <Button variant="outline" onClick={openPool}>
                  Xem hoạt động chưa xếp lịch
                </Button>
              )}
              {sidePanel === 'pool' && (
                <Button variant="outline" onClick={() => setSidePanel('none')}>
                  Ẩn danh sách
                </Button>
              )}
              <p>
                Kéo để sắp xếp. Hoạt động vừa thả và phần phía sau trong ngày sẽ chưa xếp giờ. Chọn
                menu hoạt động để chỉnh sửa sau.
              </p>
            </div>
          </details>
        </div>
      </div>
      <p role="status" aria-live="polite" className={styles.srOnly}>
        {dnd.announcement}
      </p>
      {day === 'ALL' ? (
        <div className={styles.allDays}>
          {[...days, ...(sidePanel === 'pool' ? [] : ['POOL'])].map((value) => {
            const group = visible.filter(
              (activity) => (gatewayActivityDay(activity, trip.timezone) ?? 'POOL') === value,
            );
            return (
              <section key={value}>
                <h3>
                  {value === 'POOL'
                    ? 'Chưa xếp lịch'
                    : `Ngày ${days.indexOf(value) + 1} · ${value}`}
                </h3>
                <DropList
                  day={value === 'POOL' ? null : value}
                  dnd={dnd}
                  disabled={disabled || !canEdit}
                  empty={!group.length}
                  label={value === 'POOL' ? 'Hoạt động chưa xếp lịch' : `Hoạt động ngày ${value}`}
                >
                  {group.map((activity, index) => row(activity, index, group))}
                </DropList>
              </section>
            );
          })}
        </div>
      ) : (
        <DropList
          day={day === 'POOL' ? null : day}
          dnd={dnd}
          disabled={disabled || !canEdit}
          empty={!visible.length}
          label="Các hoạt động trong lịch trình"
        >
          {visible.map((activity, index) => row(activity, index, visible))}
        </DropList>
      )}
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
      <p className={styles.poolHelp}>
        {canEdit
          ? 'Kéo hoạt động sang lịch trình để thêm vào ngày đang chọn. Có thể tiếp tục sắp xếp rồi chọn chỉnh sửa sau.'
          : 'Các địa điểm đã chọn và hoạt động chưa được xếp vào ngày. Bạn đang xem lịch trình ở chế độ chỉ đọc.'}
      </p>
      <DropList
        day={null}
        dnd={dnd}
        disabled={disabled || !canEdit}
        pool
        empty={!poolActivities.length && !poolLocations.length}
        label="Đã chọn · Chưa xếp lịch"
      >
        {poolActivities.map((activity, index) => row(activity, index, poolActivities, true))}
        {poolLocations.map((location) => (
          <LocationRow
            key={location.id}
            location={location}
            disabled={disabled}
            editable={canEdit}
            dnd={dnd}
          />
        ))}
      </DropList>
    </section>
  );
  const draggedTitle = dnd.draggingKey?.startsWith('activity:')
    ? items.find(
        (activity) => gatewayDragKey({ type: 'ACTIVITY', id: activity.id }) === dnd.draggingKey,
      )?.title
    : plan.selectedLocations.find(
        (location) => gatewayDragKey({ type: 'LOCATION', id: location.id }) === dnd.draggingKey,
      )?.name;
  return (
    <DragDropProvider
      sensors={[
        PointerSensor.configure({ preventActivation: (event) => event.pointerType === 'touch' }),
      ]}
      plugins={(defaults) => [
        ...defaults,
        Accessibility.configure({
          screenReaderInstructions: {
            draggable:
              'Nhấn Enter để kéo, lên xuống để chọn vị trí, trái về giỏ, phải sang ngày đang chọn, Enter thả, Escape hủy.',
          },
        }),
      ]}
      onDragStart={dnd.onDragStart}
      onDragMove={dnd.onDragMove}
      onDragEnd={dnd.onDragEnd}
    >
      <div
        data-runtime-timeline
        className={styles.workspace}
        onTouchStartCapture={dnd.onTouchStartCapture}
      >
        {!compactPool && dayBar}
        <PlanMetrics trip={trip} plan={plan} day={day} />
        {!compactPool && feedback}
        {compactPool ? (
          <>
            <Button ref={poolTrigger} variant="outline" onClick={openPool}>
              Thêm hoạt động
            </Button>
            <Drawer
              open
              label="Sắp xếp lịch trình"
              side="right"
              className={styles.plannerDrawer ?? ''}
              returnFocusRef={poolTrigger}
              onDismiss={() => setSidePanel('none')}
            >
              <div
                data-runtime-timeline
                className={styles.workspace}
                onTouchStartCapture={dnd.onTouchStartCapture}
              >
                {dayBar}
                {feedback}
                <div className={styles.compactPlanner}>
                  {timeline}
                  {pool}
                </div>
                <div className={styles.recoveryUtilities}>{utilities}</div>
              </div>
            </Drawer>
          </>
        ) : sidePanel !== 'none' ? (
          <SplitPanel
            variant="itinerary"
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
            initialSecondaryOpen
            onSecondaryDismiss={() => {
              setSidePanel('none');
              (sidePanel === 'map' ? mapTrigger : poolTrigger).current?.focus();
            }}
          />
        ) : (
          timeline
        )}
      </div>
      <DragOverlay dropAnimation={reduced ? null : { duration: 180, easing: 'ease-out' }}>
        {dnd.draggingKey && (
          <div className={styles.overlay}>
            <Icon name="grip" />
            <strong>{draggedTitle}</strong>
          </div>
        )}
      </DragOverlay>
    </DragDropProvider>
  );
}
