import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Tabs } from 'radix-ui';
import { paths } from '../../app/route-paths';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import { BrandWordmark } from '../../shared/components/BrandWordmark';
import { PageBreadcrumb } from '../../shared/components/PageBreadcrumb';
import { TripHero } from '../trips/components/TripHero';
import type { TripDetailViewModel } from '../trips/model/trip-detail';
import { tripDateLabel } from '../trips/model/trip-list-query';
import { tripQueryKeys } from '../trips/model/trip-query-keys';
import { useTripRepository } from '../trips/repositories/repository-context';
import fileIcon from '../../shared/assets/figma/new-surfaces/eb5f4.svg';
import documentIcon from '../../shared/assets/figma/new-surfaces/3d47e.svg';
import imageIcon from '../../shared/assets/figma/new-surfaces/65bc4.svg';
import linkBadge from '../../shared/assets/figma/new-surfaces/ffb7b.svg';
import calendarIcon from '../../shared/assets/figma/new-surfaces/9c6ad.svg';
import lockIcon from '../../shared/assets/figma/new-surfaces/b9783.svg';
import downloadIcon from '../../shared/assets/figma/new-surfaces/74d69.svg';
import linkIcon from '../../shared/assets/figma/new-surfaces/b0557.svg';
import historyFile from '../../shared/assets/figma/new-surfaces/751b2.svg';
import historyDownload from '../../shared/assets/figma/new-surfaces/fa333.svg';
import hourglass from '../../shared/assets/figma/new-surfaces/191ce.svg';
import selectedCheck from '../../shared/assets/figma/new-surfaces/dacca.svg';
import styles from './SharingPage.module.css';

export interface ExportHistoryItem {
  id: string;
  title: string;
  time: string;
  status: 'complete' | 'processing';
  fresh?: boolean;
}
export interface SharingModel {
  name: string;
  dateLabel: string;
  memberLabel: string;
  cover: string | null;
  days: readonly string[];
  history: readonly ExportHistoryItem[];
  documentPages?: number;
  link?: { url: string; expires: string; content: string; password: boolean };
}
export function ShareBadge({
  icon,
  tone = 'blue',
  small = false,
}: {
  icon: string;
  tone?: string;
  small?: boolean;
}) {
  return (
    <span
      className={styles.badge}
      data-tone={tone}
      data-small={small || undefined}
      aria-hidden="true"
    >
      <img src={icon} alt="" />
    </span>
  );
}
const formats = [
  { id: 'pdf', label: 'PDF (A4)', hint: 'Lịch trình in ấn đẹp', icon: documentIcon, tone: 'coral' },
  {
    id: 'excel',
    label: 'Excel (.xlsx)',
    hint: 'Bảng tính chỉnh sửa được',
    icon: documentIcon,
    tone: 'green',
  },
  {
    id: 'image',
    label: 'Ảnh infographic (.png)',
    hint: 'Chia sẻ mạng xã hội',
    icon: imageIcon,
    tone: 'violet',
  },
] as const;
const sharingTabs = [
  { id: 'export-options', label: 'Xuất tệp' },
  { id: 'public-share', label: 'Public Share' },
  { id: 'export-history', label: 'Lịch sử' },
] as const;
/** Source W13 variants. No generated jobs/links are fabricated by this view. */
export function SharingWorkspaceView({
  model,
  onUnavailable,
  onExportPdf,
  toast,
}: {
  model: SharingModel;
  onUnavailable: (action: string) => void;
  onExportPdf?: () => void;
  toast?: ReactNode;
}) {
  const { hash, pathname, search } = useLocation();
  const navigate = useNavigate();
  const tab = sharingTabs.find(({ id }) => `#${id}` === hash)?.id ?? 'export-options';
  const [format, setFormat] = useState('pdf');
  const [choices, setChoices] = useState<Record<string, boolean>>({});
  const [expiry, setExpiry] = useState(model.link?.expires ?? ''),
    [password, setPassword] = useState('');
  const supportedPdf = format === 'pdf' && !!onExportPdf;

  function checkOption(label: string, initial = true) {
    const key = `${tab}:${label}`;
    return (
      <label key={key} className={styles.check}>
        <input
          type="checkbox"
          checked={choices[key] ?? initial}
          onChange={(event) => {
            const { checked } = event.target;
            setChoices((current) => ({ ...current, [key]: checked }));
          }}
        />
        <span aria-hidden="true" />
        {label}
      </label>
    );
  }

  return (
    <Tabs.Root
      className={styles.workspace}
      activationMode="manual"
      value={tab}
      onValueChange={(id) =>
        navigate({ pathname, search, hash: `#${id}` }, { preventScrollReset: true })
      }
    >
      <Tabs.List className={styles.tabs} aria-label="Xuất và chia sẻ">
        {sharingTabs.map(({ id, label }) => (
          <Tabs.Trigger key={id} value={id}>
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value="export-options" className={styles.exportPanel}>
        <section className={`${styles.panel} ${styles.options}`} aria-labelledby="export-title">
          <div className={styles.panelHeading}>
            <ShareBadge icon={fileIcon} />
            <h2 id="export-title">Tùy chọn xuất tệp</h2>
          </div>
          <p className={styles.label}>Định dạng tệp</p>
          <div className={styles.formats} role="radiogroup" aria-label="Định dạng tệp">
            {formats.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={format === item.id}
                className={styles.format}
                onClick={() => setFormat(item.id)}
              >
                <ShareBadge icon={item.icon} tone={item.tone} small />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
                {format === item.id && (
                  <img className={styles.selected} src={selectedCheck} alt="" />
                )}
              </button>
            ))}
          </div>
          {supportedPdf ? (
            <p className={styles.label}>Toàn bộ lịch trình</p>
          ) : (
            <>
              <p className={styles.label}>Chọn ngày trong lịch trình</p>
              <div className={styles.checks}>
                {checkOption('Tất cả các ngày')}
                {model.days.map((day) => checkOption(day))}
              </div>
              <p className={styles.label}>Chọn nội dung hiển thị</p>
              <div className={styles.checks}>
                {checkOption('Lịch trình chi tiết')}
                {checkOption('Bản đồ & địa điểm')}
              </div>
            </>
          )}
          <Button
            className={styles.bottomButton}
            icon={<img src={downloadIcon} alt="" />}
            onClick={() => (supportedPdf ? onExportPdf?.() : onUnavailable('Xuất tệp'))}
          >
            {supportedPdf ? 'Xem trước PDF' : 'Tạo bản xuất'}
          </Button>
        </section>
        <section
          className={`${styles.panel} ${styles.preview}`}
          aria-labelledby="document-preview-title"
        >
          <div className={styles.previewTitle}>
            <h2 id="document-preview-title">Xem trước tài liệu</h2>
            <span>{format === 'pdf' ? 'PDF · A4' : format === 'excel' ? 'Excel' : 'PNG'}</span>
          </div>
          <div className={styles.document}>
            <div className={styles.documentBrand}>
              <BrandWordmark />
            </div>
            {model.cover && <img className={styles.documentCover} src={model.cover} alt="" />}
            <h3>{model.name.toLocaleUpperCase('vi-VN')}</h3>
            <p>
              {model.dateLabel} · {model.memberLabel}
            </p>
            <strong>Mục lục</strong>
            <p>1. Tổng quan · 2. Lịch trình · 3. Bản đồ · 4. Dress code / Packing</p>
          </div>
          <div className={styles.pagination}>
            <button
              type="button"
              aria-label="Trang trước"
              onClick={() => onUnavailable('Xem trước tài liệu')}
            >
              ‹
            </button>
            <span>{model.documentPages ? `1 / ${model.documentPages}` : 'Bản xem bố cục'}</span>
            <button
              type="button"
              aria-label="Trang sau"
              onClick={() => onUnavailable('Xem trước tài liệu')}
            >
              ›
            </button>
          </div>
        </section>
      </Tabs.Content>
      <Tabs.Content value="export-history">
        <section className={`${styles.panel} ${styles.history}`} aria-labelledby="history-title">
          <h2 id="history-title">Lịch sử xuất tệp</h2>
          {!model.history.length && <p className={styles.empty}>Lịch sử xuất tệp chưa khả dụng.</p>}
          {model.history.map((item) => (
            <div key={item.id} className={styles.historyRow} data-fresh={item.fresh || undefined}>
              <span
                className={styles.historyIcon}
                data-processing={item.status === 'processing' || undefined}
              >
                <img src={item.status === 'processing' ? hourglass : historyFile} alt="" />
              </span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.time}</small>
              </div>
              <span
                className={styles.status}
                data-processing={item.status === 'processing' || undefined}
              >
                {item.status === 'processing' ? 'Đang tạo...' : 'Hoàn thành'}
              </span>
              {item.status === 'complete' && (
                <button
                  className={styles.iconButton}
                  type="button"
                  aria-label={`Tải ${item.title}`}
                  onClick={() => onUnavailable('Tải tệp')}
                >
                  <img src={historyDownload} alt="" />
                </button>
              )}
            </div>
          ))}
        </section>
      </Tabs.Content>
      <Tabs.Content value="public-share">
        <section className={`${styles.panel} ${styles.public}`} aria-labelledby="public-title">
          <div className={styles.panelHeading}>
            <ShareBadge icon={linkBadge} tone="violet" />
            <div>
              <h2 id="public-title">Public Share</h2>
              <small>Chỉ xem</small>
            </div>
          </div>
          {model.link ? (
            <>
              <div className={styles.activeLink}>
                <strong>● Public Share đang hoạt động</strong>
                <p>Link chỉ xem phản ánh dữ liệu hiện tại trong phạm vi được Owner cho phép.</p>
              </div>
              <div className={styles.linkValue}>{model.link.url}</div>
              <dl className={styles.linkDetails}>
                <div>
                  <dt>Hết hạn</dt>
                  <dd>{model.link.expires}</dd>
                </div>
                <div>
                  <dt>Mật khẩu</dt>
                  <dd>{model.link.password ? 'Đã đặt' : 'Không đặt'}</dd>
                </div>
                <div>
                  <dt>Nội dung</dt>
                  <dd>{model.link.content}</dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <p className={styles.description}>Tạo liên kết đọc cho người ngoài Trip.</p>
              <p className={styles.label}>Nội dung được chia sẻ</p>
              <div className={styles.checks}>
                {checkOption('Lịch trình')}
                {checkOption('Bản đồ & địa điểm')}
                {checkOption('Dress code')}
                {checkOption('Packing list', false)}
              </div>
              <Input
                label="Ngày hết hạn"
                value={expiry}
                placeholder="dd/mm/yyyy"
                leadingIcon={<img src={calendarIcon} alt="" />}
                onChange={(event) => setExpiry(event.target.value)}
              />
              <Input
                label="Mật khẩu"
                type="password"
                value={password}
                placeholder="Tùy chọn"
                leadingIcon={<img src={lockIcon} alt="" />}
                onChange={(event) => setPassword(event.target.value)}
              />
            </>
          )}
          <p className={styles.privacy}>
            Finance và dữ liệu riêng tư không được đưa vào Public Share.
          </p>
          {model.link ? (
            <div className={styles.linkActions}>
              <div>
                <Button variant="outline" onClick={() => onUnavailable('Xem trước liên kết')}>
                  Xem trước
                </Button>
                <Button onClick={() => onUnavailable('Sao chép liên kết')}>Sao chép</Button>
              </div>
              <Button variant="outline" onClick={() => onUnavailable('Thu hồi liên kết')}>
                Thu hồi link
              </Button>
            </div>
          ) : (
            <Button
              className={styles.bottomButton}
              icon={<img src={linkIcon} alt="" />}
              onClick={() => onUnavailable('Tạo liên kết chỉ xem')}
            >
              Tạo link chỉ xem
            </Button>
          )}
        </section>
      </Tabs.Content>
      {toast}
    </Tabs.Root>
  );
}
export function SharingPageView({
  trip,
  model,
  onUnavailable,
  onExportPdf,
  toast,
}: {
  trip: TripDetailViewModel;
  model: SharingModel;
  onUnavailable: (action: string) => void;
  onExportPdf?: () => void;
  toast?: ReactNode;
}) {
  return (
    <section className={styles.page} data-node-id="943:15187">
      <PageBreadcrumb
        items={[
          { label: 'Chuyến đi của tôi', to: paths.trips },
          { label: trip.name, to: paths.trip(trip.id) },
        ]}
        current="Xuất & chia sẻ"
      />
      <TripHero trip={trip} compact />
      <SharingWorkspaceView
        model={model}
        onUnavailable={onUnavailable}
        {...(onExportPdf ? { onExportPdf } : {})}
        toast={toast}
      />
    </section>
  );
}
export function SharingPage() {
  const { tripId = '' } = useParams(),
    repository = useTripRepository();
  const navigate = useNavigate();
  const { key: locationKey } = useLocation();
  const [notice, setNotice] = useState<{ locationKey: string; message: string } | null>(null);
  const query = useQuery({
    queryKey: tripQueryKeys.detail(tripId, 'success'),
    queryFn: ({ signal }) => repository.getTrip({ tripId, scenario: 'success', signal }),
    enabled: !!tripId,
  });
  const result = query.data;
  if (query.isPending) return <ContentState state="loading" />;
  if (!result || result.status !== 'ready') return <ContentState state="unavailable" />;
  const trip = result.data;
  return (
    <SharingPageView
      key={trip.id}
      trip={trip}
      model={{
        name: trip.name,
        dateLabel: tripDateLabel(trip),
        memberLabel:
          trip.presentation.memberCount === null
            ? 'Thành viên'
            : `${trip.presentation.memberCount} thành viên`,
        cover: trip.presentation.cover?.src ?? null,
        days: [],
        history: [],
      }}
      {...(repository.planPdf && trip.permissions.canRead && trip.currentMembership.leftAt === null
        ? { onExportPdf: () => navigate(`${paths.settings(trip.id)}?mode=settings&section=export`) }
        : {})}
      onUnavailable={(action) =>
        setNotice({
          locationKey,
          message: `${action} chưa khả dụng trong phiên bản hiện tại. Không có dữ liệu được gửi hoặc thay đổi.`,
        })
      }
      toast={notice?.locationKey === locationKey ? <Alert live>{notice.message}</Alert> : undefined}
    />
  );
}
