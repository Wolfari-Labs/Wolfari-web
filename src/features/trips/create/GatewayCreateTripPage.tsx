import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useTripRepository } from '../repositories/repository-context';
import type { CreateTripIntent } from '../repositories/trip.repository';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Textarea } from '../../../shared/components/Textarea';
import { Alert } from '../../../shared/components/Alert';
import { browserStorage, createStorageFallback } from '../../../shared/lib/browser-storage';
import { validCalendarDate, nextCalendarDate } from '../../../shared/lib/calendar';
import { localTimeToIso } from '../../plan/model/plan-draft';
import { CreateTripSuccess } from './CreateTripSuccess';
import banner from '../../../shared/assets/figma/32882.svg';
import styles from './CreateTripPage.module.css';

interface Draft {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  timezone: string;
}
const empty = (): Draft => ({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  timezone: 'Asia/Ho_Chi_Minh',
});
function restore(raw: string | null): { draft: Draft; intent: CreateTripIntent | null } {
  if (!raw) return { draft: empty(), intent: null };
  const data = JSON.parse(raw) as { draft: Draft; intent: CreateTripIntent | null };
  if (
    !data ||
    !data.draft ||
    !Object.keys(empty()).every((key) => typeof data.draft[key as keyof Draft] === 'string')
  )
    throw Error('Bản nháp không hợp lệ.');
  const i = data.intent;
  if (
    i !== null &&
    (!i ||
      typeof i.name !== 'string' ||
      !i.name.trim() ||
      typeof i.timezone !== 'string' ||
      !Number.isFinite(Date.parse(i.startAt)) ||
      !(Date.parse(i.endAt) > Date.parse(i.startAt)) ||
      !/^[0-9a-f-]{36}$/i.test(i.clientRequestId) ||
      (i.description !== undefined && typeof i.description !== 'string'))
  )
    throw Error('Yêu cầu phục hồi không hợp lệ.');
  return data;
}
export function GatewayCreateTripPage({ actorId }: { actorId: string }) {
  const repository = useTripRepository();
  const key = `wolfari:create-trip:v3:${actorId}`;
  const cache = useRef(createStorageFallback());
  const initial = useRef<{
    draft: Draft;
    intent: CreateTripIntent | null;
    invalid: boolean;
  } | null>(null);
  if (!initial.current) {
    try {
      initial.current = {
        ...restore(cache.current.read(browserStorage('sessionStorage'), key).raw),
        invalid: false,
      };
    } catch {
      initial.current = { draft: empty(), intent: null, invalid: true };
    }
  }
  const [draft, setDraft] = useState(initial.current.draft);
  const [intent, setIntent] = useState(initial.current.intent);
  const [message, setMessage] = useState(
    initial.current.invalid
      ? 'Dữ liệu phục hồi không hợp lệ. Không gửi yêu cầu mới; hãy kiểm tra danh sách chuyến đi.'
      : '',
  );
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [memoryOnly, setMemoryOnly] = useState(false);
  const request = useRef<AbortController | null>(null);
  const sending = useRef(false);
  const persist = (nextDraft: Draft, nextIntent: CreateTripIntent | null) => {
    const status = cache.current.write(
      browserStorage('sessionStorage'),
      key,
      JSON.stringify({ draft: nextDraft, intent: nextIntent }),
    );
    setMemoryOnly(status !== 'saved');
    return status === 'saved';
  };
  useEffect(() => {
    const oldKeys = ['wolfari:create-trip:v1', 'wolfari:create-trip:v2'];
    for (const oldKey of oldKeys) {
      try {
        browserStorage('sessionStorage')?.removeItem(oldKey);
      } catch {
        /* Do not import ownerless drafts. */
      }
    }
    return () => {
      request.current?.abort();
      cache.current.clear();
    };
  }, []);
  const edit = (field: keyof Draft, value: string) => {
    if (busy || intent) return;
    const next = { ...draft, [field]: value };
    setDraft(next);
    persist(next, null);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending.current || initial.current?.invalid || !actorId) return;
    let snapshot = intent;
    try {
      if (!snapshot) {
        if (
          !draft.name.trim() ||
          draft.name.trim().length > 200 ||
          !validCalendarDate(draft.startDate) ||
          !validCalendarDate(draft.endDate) ||
          draft.endDate < draft.startDate
        )
          throw Error('Nhập tên và khoảng ngày hợp lệ.');
        new Intl.DateTimeFormat('en', { timeZone: draft.timezone });
        snapshot = {
          name: draft.name.trim(),
          ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
          startAt: localTimeToIso(draft.startDate, '00:00', draft.timezone),
          endAt: localTimeToIso(nextCalendarDate(draft.endDate), '00:00', draft.timezone),
          timezone: draft.timezone,
          clientRequestId: crypto.randomUUID(),
        };
        if (!persist(draft, snapshot))
          throw Error('Cần bật bộ nhớ phiên để lưu yêu cầu an toàn trước khi tạo Trip.');
        setIntent(snapshot);
      }
      sending.current = true;
      setBusy(true);
      setMessage('');
      const controller = new AbortController();
      request.current = controller;
      const result = await repository.createTrip({ intent: snapshot, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (result.status === 'created') {
        cache.current.write(browserStorage('sessionStorage'), key, null);
        setCreated(result.tripId);
        setIntent(null);
      } else if (result.status === 'validation-error' || result.status === 'forbidden') {
        setIntent(null);
        persist(draft, null);
        setMessage(
          result.status === 'forbidden'
            ? 'Bạn không có quyền tạo chuyến đi.'
            : 'Thông tin chưa hợp lệ. Kiểm tra tên, ngày và múi giờ.',
        );
      } else {
        setMessage(
          'Chưa xác nhận được kết quả. Yêu cầu đã được giữ nguyên; kiểm tra danh sách hoặc thử lại đúng yêu cầu cũ. Không tạo bản sao.',
        );
      }
    } catch (error) {
      if (!request.current?.signal.aborted)
        setMessage(
          error instanceof Error
            ? error.message
            : 'Kết nối gián đoạn. Giữ nguyên yêu cầu để thử lại.',
        );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };
  return (
    <section className={`${styles.page} ${styles.gatewayPage}`} data-flow="create-trip">
      <img className={styles.banner} src={banner} alt="" />
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>CHUYẾN ĐI MỚI</p>
          <h1>Tạo chuyến đi mới</h1>
          <p>Chọn điểm bắt đầu cho hành trình cùng nhau.</p>
        </div>
        <Link to="/trips">Chuyến đi của tôi</Link>
      </header>
      <form
        onSubmit={(event) => void submit(event)}
        className={`${styles.formCard} ${styles.gatewayForm}`}
      >
        {message && <Alert live>{message}</Alert>}
        {memoryOnly && (
          <Alert tone="warning">
            Bản nháp chỉ còn trong tab; chưa thể gửi yêu cầu mới an toàn.
          </Alert>
        )}
        {intent && (
          <Alert tone="warning">
            Đang giữ yêu cầu đã gửi. Nội dung bị khóa đến khi xác định được kết quả.
          </Alert>
        )}
        <fieldset disabled={busy || !!intent || initial.current.invalid}>
          <Input
            label="Tên chuyến đi"
            value={draft.name}
            maxLength={200}
            required
            onChange={(e) => edit('name', e.target.value)}
          />
          <div className={styles.dates}>
            <Input
              label="Ngày đi"
              type="date"
              value={draft.startDate}
              required
              onChange={(e) => edit('startDate', e.target.value)}
            />
            <Input
              label="Ngày về"
              type="date"
              value={draft.endDate}
              min={draft.startDate}
              required
              onChange={(e) => edit('endDate', e.target.value)}
            />
          </div>
          <Input
            label="Múi giờ"
            hint="Ví dụ: Asia/Ho_Chi_Minh"
            value={draft.timezone}
            required
            onChange={(e) => edit('timezone', e.target.value)}
          />
          <Textarea
            label="Mô tả ngắn"
            value={draft.description}
            maxLength={500}
            onChange={(e) => edit('description', e.target.value)}
          />
        </fieldset>
        <p>Bạn có thể thiết lập ngân sách trong Quỹ nhóm sau khi tạo chuyến đi.</p>
        <div className={styles.actions}>
          <Link to="/trips">Xem danh sách chuyến đi</Link>
          <Button type="submit" loading={busy} disabled={initial.current.invalid || !!created}>
            {intent ? 'Thử lại đúng yêu cầu cũ' : 'Tạo chuyến đi'}
          </Button>
        </div>
      </form>
      {created && <CreateTripSuccess tripId={created} onContinue={() => setCreated(null)} />}
    </section>
  );
}
