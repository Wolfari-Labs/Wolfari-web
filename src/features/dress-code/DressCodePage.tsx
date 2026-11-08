import { useMemo, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router';
import type { RouteContext } from '../../app/route-context';
import { paths } from '../../app/route-paths';
import { CapabilityNote } from '../../shared/components/CapabilityNote';
import { Select } from '../../shared/components/Select';
import { Button } from '../../shared/components/Button';
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
import { TripHero } from '../trips/components/TripHero';
import sendIcon from '../../shared/assets/figma/ac8db.svg';
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

function OutfitCard({ item, index }: { item: DressCodeViewModel; index: number }) {
  const isEvening = index % 2 === 1;
  const title =
    item.scopeType === 'TRIP'
      ? 'Dạo biển'
      : item.scopeType === 'DAY'
        ? 'Dạo phố buổi tối'
        : item.label;
  const artwork = isEvening ? eveningOutfit : beachOutfit;
  const mobileArtwork = isEvening ? mobileEveningOutfit : mobileBeachOutfit;
  const swatches = isEvening
    ? [eveningSwatch1, eveningSwatch2, eveningSwatch3]
    : [beachSwatch1, beachSwatch2, beachSwatch3];
  return (
    <article className={styles.card} aria-label={title}>
      <div className={styles.cardHeader}>
        <h3>{title}</h3>
        <span className={styles.cardBadge}>{isEvening ? 'Gợi ý' : 'Cả chuyến'}</span>
      </div>
      <picture className={styles.artwork}>
        <source media="(max-width: 768px)" srcSet={mobileArtwork} />
        <img src={artwork} alt="Minh họa phối trang phục" />
      </picture>
      <div className={styles.palette}>
        <span>Minh họa</span>
        <div aria-label="Bảng màu minh họa">
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
        <strong>{sourceLabel(item.source)}</strong>
        <p>
          {item.description ??
            item.publicDescription ??
            'Trang phục thoải mái, phù hợp hoạt động và thời tiết.'}
        </p>
        {item.source === 'DSS' && <small>Nguồn: Gợi ý đã lưu trước đây</small>}
        {isEvening && (
          <small>
            Hoạt động: Ăn tối · {item.planDate ?? '12/10/2026'}
            <br />
            Nguồn: Mẫu du lịch · 10/10, 09:00
          </small>
        )}
        {!isEvening && item.label !== title && <small>{item.label}</small>}
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
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState(
    'Trang phục thoải mái, phù hợp hoạt động và thời tiết.',
  );
  const [draftChecked, setDraftChecked] = useState(false);
  const [draftScope, setDraftScope] = useState<'DAY' | 'ACTIVITY'>('DAY');
  const [draftDate, setDraftDate] = useState(''),
    [draftActivity, setDraftActivity] = useState('');
  const [draftError, setDraftError] = useState('');
  const snapshot = useTripPlanSnapshot(tripId, scenario);
  const data = snapshot.state.status === 'ready' ? snapshot.state : null;
  const allItems = data?.plan.dressCodes ?? [];
  const filteredItems = useMemo(
    () => allItems.filter((item) => scope === 'ALL' || item.scopeType === scope),
    [allItems, scope],
  );
  const groups = data ? groupDressCodes(filteredItems, data.plan.activities) : [];
  const items = groups.flatMap((group) => group.items);
  const trip = data?.trip;
  const title = trip?.name;

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
      <div className={styles.breadcrumb}>
        <Link to={paths.trip(tripId)}>⌂&nbsp; Chuyến đi của tôi</Link>
        <span aria-hidden="true">›</span>
        <span>{title}</span>
        <span aria-hidden="true">›</span>
        <h1 className={styles.pageTitle}>Dress code</h1>
      </div>
      {trip && <TripHero trip={trip} compact />}
      <TripPlanBoundary state={snapshot.state} onRetry={snapshot.retry}>
        <div className={styles.scopeTabs} role="tablist" aria-label="Phạm vi dress code">
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
        <div className={styles.contentGrid}>
          <div className={styles.cards}>
            {items.map((item, index) => (
              <OutfitCard key={item.id} item={item} index={index} />
            ))}
            {!items.length && (
              <div className={styles.empty} role="status">
                <h2>Chưa có dress code đã lưu</h2>
                <p>Chưa có hướng dẫn trong phạm vi đang chọn.</p>
              </div>
            )}
          </div>
          <aside className={styles.editor} aria-label="Tạo hoặc sửa Dress code">
            <h2>Tạo / sửa Dress code</h2>
            <DraftField
              label="Tiêu đề"
              value={draftTitle}
              placeholder="Nhập tiêu đề Dress code"
              onChange={setDraftTitle}
            />
            <Select
              label="Phạm vi"
              value={draftScope}
              onChange={(event) => {
                setDraftScope(event.target.value as 'DAY' | 'ACTIVITY');
                setDraftChecked(false);
              }}
            >
              <option value="DAY">Theo ngày</option>
              <option value="ACTIVITY">Theo hoạt động</option>
            </Select>
            {draftScope === 'DAY' ? (
              <Select
                label="Ngày trong chuyến đi"
                value={draftDate}
                onChange={(e) => {
                  setDraftDate(e.target.value);
                  setDraftChecked(false);
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
                  setDraftChecked(false);
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
            <div className={styles.editorNote}>
              <p>Ảnh và bảng màu đều là minh họa mẫu.</p>
              <p>
                {draftChecked
                  ? 'Bản nháp đã được kiểm tra cục bộ.'
                  : 'Bản nháp chưa được lưu vào kế hoạch.'}
              </p>
            </div>
            <Button
              className={styles.checkButton}
              icon={<img src={sendIcon} alt="" />}
              disabled={!data || !activePlan(data.trip) || !data.plan.permissions.canEdit}
              onClick={() => {
                const valid = validDressWrite({
                  scopeType: draftScope,
                  planDate: draftScope === 'DAY' ? draftDate : null,
                  activityId: draftScope === 'ACTIVITY' ? draftActivity : null,
                  label: draftTitle.trim(),
                  description: draftDescription || null,
                  publicDescription: null,
                });
                setDraftChecked(valid);
                setDraftError(
                  valid ? '' : 'Nhập tiêu đề (tối đa 100 ký tự) và chọn ngày hoặc Activity hợp lệ.',
                );
              }}
            >
              Kiểm tra bản nháp
            </Button>
            {draftError && <p role="alert">{draftError}</p>}
            <CapabilityNote tone="info">
              Gợi ý và chỉnh sửa chỉ tạo bản nháp cục bộ; chưa gửi thay đổi lên kế hoạch.
            </CapabilityNote>
          </aside>
        </div>
      </TripPlanBoundary>
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
