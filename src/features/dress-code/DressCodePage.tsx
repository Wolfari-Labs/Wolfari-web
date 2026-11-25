import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useParams } from 'react-router';
import type { RouteContext } from '../../app/route-context';
import { paths } from '../../app/route-paths';
import { Select } from '../../shared/components/Select';
import { Button } from '../../shared/components/Button';
import { PageBreadcrumb } from '../../shared/components/PageBreadcrumb';
import { Icon } from '../../shared/components/Icon';
import { Drawer } from '../../shared/components/Drawer';
import { ActionMenu, ConfirmDialog } from '../../shared/components/Ui';
import { TripHero } from '../trips/components/TripHero';
import { TripPlanBoundary } from '../plan/components/TripPlanBoundary';
import { useTripPlanSnapshot } from '../plan/hooks/use-trip-plan-snapshot';
import { planScenarios, type DressCodeViewModel, type PlanScenario } from '../plan/model/plan';
import { groupDressCodes } from './dress-code';
import styles from './DressCodePage.module.css';
import beachOutfit from '../../shared/assets/figma/4fb58.svg';
import eveningOutfit from '../../shared/assets/figma/1f0e7.svg';
import mobileBeachOutfit from '../../shared/assets/figma/995a5.svg';
import mobileEveningOutfit from '../../shared/assets/figma/dd6a7.svg';
import beachSwatch1 from '../../shared/assets/figma/dff1d.svg';
import beachSwatch2 from '../../shared/assets/figma/fda03.svg';
import beachSwatch3 from '../../shared/assets/figma/7e261.svg';
import eveningSwatch1 from '../../shared/assets/figma/87080.svg';
import eveningSwatch2 from '../../shared/assets/figma/85af1.svg';
import eveningSwatch3 from '../../shared/assets/figma/41300.svg';
import officialLogo from '../../shared/assets/figma/44363.png';
import { GatewayDressCodePage } from './GatewayDressCodePage';
import { activePlan, validDressWrite } from '../plan/model/preparation';
import { planDays } from '../plan/model/plan-presentation';

type DressScope = 'ALL' | 'DAY' | 'ACTIVITY';

const scopeLabels: Record<DressScope, string> = {
  ALL: 'Cả chuyến',
  DAY: 'Theo ngày',
  ACTIVITY: 'Theo hoạt động',
};

const tags = ['Tắm biển', 'Tham quan', 'Ăn uống'];

/** `2026-09-22` → `22/09/2026` (date-only values; no timezone shift). */
function displayPlanDate(value: string) {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function sourceLabel(source: DressCodeViewModel['source']) {
  return source === 'DSS' ? 'Gợi ý từ mẫu du lịch' : 'Đã đưa vào kế hoạch';
}

function DraftField({
  label,
  value,
  placeholder,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function OutfitCard({
  item,
  index,
  previewOnly,
  onEdit,
  onDelete,
}: {
  item: DressCodeViewModel;
  index: number;
  previewOnly: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isEvening = index % 2 === 1;
  const title = item.label;
  const artwork = isEvening ? eveningOutfit : beachOutfit;
  const mobileArtwork = isEvening ? mobileEveningOutfit : mobileBeachOutfit;
  const swatches = isEvening
    ? [eveningSwatch1, eveningSwatch2, eveningSwatch3]
    : [beachSwatch1, beachSwatch2, beachSwatch3];
  return (
    <article className={styles.card} aria-label={title} data-tone={isEvening ? 'evening' : 'day'}>
      <div className={styles.cardHeader}>
        <h3>{title}</h3>
        <span className={styles.cardBadge}>
          {previewOnly
            ? 'Bản xem trước'
            : item.source === 'DSS'
              ? 'Gợi ý'
              : item.scopeType === 'TRIP'
                ? 'Cả chuyến'
                : item.scopeType === 'DAY'
                  ? 'Theo ngày'
                  : 'Theo hoạt động'}
        </span>
        <ActionMenu
          label={`Thao tác ${title}`}
          icon={<Icon name="moreVertical" />}
          items={[
            { label: 'Chỉnh sửa', action: onEdit },
            { label: 'Xóa', danger: true, action: onDelete },
          ]}
        />
      </div>
      <picture className={styles.artwork}>
        <source media="(max-width: 768px)" srcSet={mobileArtwork} />
        <img src={artwork} alt="Minh họa phối trang phục" />
      </picture>
      <span className={styles.artworkBadge} aria-hidden="true">
        <Icon name="dress" size={22} />
      </span>
      <div className={styles.palette}>
        <div role="img" aria-label="Bảng màu gợi ý">
          {swatches.map((swatch) => (
            <img key={swatch} src={swatch} alt="" />
          ))}
        </div>
      </div>
      <span className={styles.metaLabel}>Phù hợp với hoạt động</span>
      <div className={styles.tags}>
        {tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className={styles.suggestion}>
        <span className={styles.suggestionIcon} aria-hidden="true">
          <Icon name={isEvening ? 'sparkles' : 'sun'} size={18} />
        </span>
        <strong>{previewOnly ? 'Đã thêm trong bản xem trước' : sourceLabel(item.source)}</strong>
        <p>
          {item.description ??
            item.publicDescription ??
            'Trang phục thoải mái, phù hợp hoạt động và thời tiết.'}
        </p>
        {item.source === 'DSS' && <small>Nguồn: Gợi ý đã lưu trước đây</small>}
        {item.planDate && <small>Ngày: {displayPlanDate(item.planDate)}</small>}
      </div>
    </article>
  );
}

export function DressCodePage() {
  const { previewEnabled } = useOutletContext<RouteContext>();
  return previewEnabled ? <PreviewDressCodePage /> : <GatewayDressCodePage />;
}
function PreviewDressCodePage() {
  const { tripId = '' } = useParams();
  const { previewEnabled } = useOutletContext<RouteContext>();
  const [scenario, setScenario] = useState<PlanScenario>('success');
  const [scope, setScope] = useState<DressScope>('ALL');
  const [items, setItems] = useState<DressCodeViewModel[]>([]);
  const [previewOnlyIds, setPreviewOnlyIds] = useState<Set<string>>(new Set());
  const [drawerItem, setDrawerItem] = useState<DressCodeViewModel | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleting, setDeleting] = useState<DressCodeViewModel | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftScope, setDraftScope] = useState<DressCodeViewModel['scopeType']>('DAY');
  const [draftDate, setDraftDate] = useState(''),
    [draftActivity, setDraftActivity] = useState('');
  const [draftError, setDraftError] = useState('');
  const snapshot = useTripPlanSnapshot(tripId, scenario);
  const data = snapshot.state.status === 'ready' ? snapshot.state : null;
  useEffect(() => {
    setItems([...(data?.plan.dressCodes ?? [])]);
    setPreviewOnlyIds(new Set());
  }, [data?.plan.tripId, data?.plan.planVersion, scenario]);
  const openEditor = (item: DressCodeViewModel | null) => {
    setDrawerItem(item);
    setDraftTitle(item?.label ?? '');
    setDraftDescription(item?.description ?? '');
    setDraftScope(item?.scopeType ?? 'DAY');
    setDraftDate(item?.planDate ?? '');
    setDraftActivity(item?.activityId ?? '');
    setDraftError('');
    setDrawerOpen(true);
  };
  const saveOutfit = () => {
    if (!data || !activePlan(data.trip) || !data.plan.permissions.canEdit) return;
    const fields = {
      scopeType: draftScope,
      planDate: draftScope === 'DAY' ? draftDate : null,
      activityId: draftScope === 'ACTIVITY' ? draftActivity : null,
      label: draftTitle.trim(),
      description: draftDescription.trim() || null,
      publicDescription: null,
    };
    if (
      !validDressWrite(fields) ||
      (draftScope === 'DAY' &&
        !planDays(data.trip.startAt, data.trip.endAt, data.trip.timezone).includes(draftDate)) ||
      (draftScope === 'ACTIVITY' &&
        !data.plan.activities.some((activity) => activity.id === draftActivity))
    ) {
      setDraftError('Nhập tiêu đề (tối đa 100 ký tự) và chọn ngày hoặc hoạt động hợp lệ.');
      return;
    }
    const next: DressCodeViewModel = {
      id: drawerItem?.id ?? crypto.randomUUID(),
      tripId,
      ...fields,
      source: 'MANUAL',
      planVersion: data.plan.planVersion,
      referenceImageAvailable: drawerItem?.referenceImageAvailable ?? false,
    };
    setItems((current) =>
      drawerItem
        ? current.map((item) => (item.id === drawerItem.id ? next : item))
        : [...current, next],
    );
    if (!drawerItem) setPreviewOnlyIds((current) => new Set(current).add(next.id));
    setDrawerOpen(false);
  };
  const filteredItems = useMemo(
    () => items.filter((item) => scope === 'ALL' || item.scopeType === scope),
    [items, scope],
  );
  const groups = data ? groupDressCodes(filteredItems, data.plan.activities) : [];
  const visibleItems = groups.flatMap((group) => group.items);
  const trip = data?.trip;

  return (
    <section className={styles.page} data-flow="dress-code-read">
      <div className={styles.mobileHeader}>
        <img src={officialLogo} alt="Wolfari" />
        <button
          type="button"
          onClick={() =>
            document
              .querySelector<HTMLButtonElement>('[aria-label="Mở điều hướng chuyến đi"]')
              ?.click()
          }
        >
          Menu
        </button>
      </div>
      <PageBreadcrumb
        className={styles.breadcrumb}
        items={[{ label: 'Tổng quan chuyến đi', to: paths.trip(tripId) }]}
        current="Dress code"
      />
      {trip && <TripHero trip={trip} compact variant="landscape" />}
      <TripPlanBoundary state={snapshot.state} onRetry={snapshot.retry}>
        <div className={styles.contentGrid}>
          <div className={styles.mainColumn}>
            <div className={styles.controls}>
              <div className={styles.scopeTabs} role="tablist" aria-label="Phạm vi trang phục">
                {(['ALL', 'DAY', 'ACTIVITY'] as DressScope[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={scope === value}
                    className={scope === value ? styles.activeTab : ''}
                    onClick={() => setScope(value)}
                  >
                    {scopeLabels[value]}
                  </button>
                ))}
              </div>
              <Button
                className={styles.createButton}
                icon={<Icon name="plus" size={18} />}
                disabled={!data || !activePlan(data.trip) || !data.plan.permissions.canEdit}
                onClick={() => openEditor(null)}
              >
                Tạo trang phục
              </Button>
            </div>
            <div className={styles.cards}>
              {visibleItems.map((item, index) => (
                <OutfitCard
                  key={item.id}
                  item={item}
                  index={index}
                  previewOnly={previewOnlyIds.has(item.id)}
                  onEdit={() => openEditor(item)}
                  onDelete={() => setDeleting(item)}
                />
              ))}
              {!visibleItems.length && (
                <div className={styles.empty} role="status">
                  <h2>Chưa có trang phục đã lưu</h2>
                  <p>Chưa có hướng dẫn trong phạm vi đang chọn.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </TripPlanBoundary>
      <Drawer
        open={drawerOpen}
        side="right"
        label={drawerItem ? 'Chỉnh sửa trang phục' : 'Tạo trang phục'}
        onDismiss={() => setDrawerOpen(false)}
      >
        <form
          className={styles.editor}
          onSubmit={(event) => {
            event.preventDefault();
            saveOutfit();
          }}
        >
          <DraftField
            label="Tiêu đề"
            value={draftTitle}
            placeholder="Nhập tiêu đề trang phục"
            onChange={setDraftTitle}
          />
          <Select
            label="Phạm vi"
            value={draftScope}
            onChange={(event) => {
              setDraftScope(event.target.value as DressCodeViewModel['scopeType']);
            }}
          >
            <option value="TRIP">Cả chuyến</option>
            <option value="DAY">Theo ngày</option>
            <option value="ACTIVITY">Theo hoạt động</option>
          </Select>
          {draftScope === 'TRIP' ? null : draftScope === 'DAY' ? (
            <Select
              label="Ngày trong chuyến đi"
              value={draftDate}
              onChange={(e) => {
                setDraftDate(e.target.value);
              }}
            >
              <option value="">Chọn ngày</option>
              {trip &&
                planDays(trip.startAt, trip.endAt, trip.timezone).map((day) => (
                  <option key={day} value={day}>
                    {day.split('-').reverse().join('/')}
                  </option>
                ))}
            </Select>
          ) : (
            <Select
              label="Hoạt động trong chuyến đi"
              value={draftActivity}
              onChange={(e) => {
                setDraftActivity(e.target.value);
              }}
            >
              <option value="">Chọn hoạt động</option>
              {data?.plan.activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.title}
                </option>
              ))}
            </Select>
          )}
          <DraftField
            label="Mô tả"
            value={draftDescription}
            onChange={setDraftDescription}
            multiline
          />
          <div className={styles.editorNote} role="status">
            <p>Thay đổi trong bản xem trước chỉ được lưu trong phiên này.</p>
          </div>
          <Button
            type="submit"
            className={styles.checkButton}
            disabled={!data || !activePlan(data.trip) || !data.plan.permissions.canEdit}
          >
            {drawerItem ? 'Lưu thay đổi' : 'Tạo trang phục'}
          </Button>
          {draftError && <p role="alert">{draftError}</p>}
        </form>
      </Drawer>
      <ConfirmDialog
        open={!!deleting}
        title="Xóa trang phục?"
        description="Trang phục sẽ được xóa khỏi bản xem trước."
        confirmLabel="Xóa"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) setItems((current) => current.filter((item) => item.id !== deleting.id));
          if (deleting)
            setPreviewOnlyIds((current) => {
              const next = new Set(current);
              next.delete(deleting.id);
              return next;
            });
          setDeleting(null);
        }}
      />
      {previewEnabled && (
        <details className="preview">
          <summary>Dress Code preview · Dữ liệu minh họa</summary>
          <Select
            label="Trạng thái dữ liệu"
            value={scenario}
            onChange={(event) => setScenario(event.target.value as PlanScenario)}
          >
            {planScenarios.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </details>
      )}
    </section>
  );
}
