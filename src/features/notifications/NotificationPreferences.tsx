import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRuntimeServices } from '../../app/gateway-context';
import { Button } from '../../shared/components/Button';
import { Select } from '../../shared/components/Select';
import { SuccessToast } from '../../shared/components/SuccessToast';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import { Switch } from '../../shared/components/Ui';
import { useWriteScope } from '../../shared/lib/use-write-scope';
import { commandFailure } from '../../shared/lib/command-failure';
import { notificationGroups, type Preferences } from './notification.repository';
import styles from './Notifications.module.css';
const labels = {
  INVITATION: 'Lời mời',
  PLAN: 'Lịch trình',
  PACKING: 'Hành lý',
  CONTRIBUTION: 'Khoản đóng góp',
  CLOSURE: 'Chốt quỹ',
  PRICE: 'Theo dõi giá',
};
export function NotificationPreferences({ actor }: { actor: string }) {
  const repository = useRuntimeServices()?.notifications,
    cache = useQueryClient();
  const writeScope = useWriteScope(actor),
    inFlight = useRef(false);
  const query = useQuery({
    queryKey: ['notifications', actor, 'preferences'],
    queryFn: ({ signal }) => repository!.preferences(signal),
    enabled: !!repository,
    retry: false,
  });
  const [draft, setDraft] = useState<Preferences | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [conflict, setConflict] = useState(false);
  const [success, setSuccess] = useState('');
  const value = draft ?? query.data;
  if (!repository)
    return <Alert>Tùy chọn nhận thông báo khả dụng khi sử dụng tài khoản thật.</Alert>;
  if (!value)
    return query.isPending ? (
      <ContentState state="loading" />
    ) : (
      <Alert>
        Chưa tải được tùy chọn.{' '}
        <Button variant="plain" onClick={() => void query.refetch()}>
          Thử lại
        </Button>
      </Alert>
    );
  const save = async () => {
    if (inFlight.current || conflict) return;
    const signal = writeScope();
    if (signal.aborted) return;
    inFlight.current = true;
    setBusy(true);
    setMessage('');
    setSuccess('');
    try {
      const result = await repository.save(value, signal);
      if (signal.aborted) return;
      cache.setQueryData(['notifications', actor, 'preferences'], result);
      setDraft(null);
      setSuccess('Đã lưu tùy chọn thông báo.');
    } catch (error) {
      if (signal.aborted) return;
      setConflict(true);
      setMessage(
        commandFailure(error).conflict
          ? 'Tùy chọn đã thay đổi. Bản nhập được giữ; tải lại để đối chiếu trước khi lưu.'
          : 'Chưa xác nhận được kết quả. Tải lại tùy chọn để đối chiếu trước khi gửi tiếp.',
      );
    } finally {
      inFlight.current = false;
      if (!signal.aborted) setBusy(false);
    }
  };
  return (
    <div className={styles.preferences} id="notifications">
      <p>
        Áp dụng cho email và thiết bị đã đăng ký. Nhận push trên trình duyệt hiện chưa được hỗ trợ.
      </p>
      <SuccessToast message={success} onDismiss={() => setSuccess('')} />
      <Switch
        label="Cho phép email"
        checked={value.email_enabled}
        disabled={busy}
        onChange={(email_enabled) => setDraft({ ...value, email_enabled })}
      />
      <Switch
        label="Cho phép push trên thiết bị đã đăng ký"
        checked={value.push_enabled}
        disabled={busy}
        onChange={(push_enabled) => setDraft({ ...value, push_enabled })}
      />
      <details>
        <summary>Tùy chọn từng nhóm</summary>
        {notificationGroups.map((group) => (
          <fieldset key={group}>
            <legend>{labels[group]}</legend>
            {(['email', 'push'] as const).map((channel) => (
              <Select
                key={channel}
                label={`${channel === 'email' ? 'Email' : 'Push'} · ${labels[group]}`}
                disabled={busy}
                value={
                  value.group_overrides[group]?.[channel] === undefined
                    ? 'inherit'
                    : String(value.group_overrides[group]?.[channel])
                }
                onChange={(e) => {
                  const next = structuredClone(value),
                    override = { ...next.group_overrides[group] };
                  if (e.target.value === 'inherit') delete override[channel];
                  else override[channel] = e.target.value === 'true';
                  if (Object.keys(override).length) next.group_overrides[group] = override;
                  else delete next.group_overrides[group];
                  setDraft(next);
                }}
              >
                <option value="inherit">Theo cài đặt chung</option>
                <option value="true">Cho phép nếu kênh chung bật</option>
                <option value="false">Tắt nhóm này</option>
              </Select>
            ))}
          </fieldset>
        ))}
      </details>
      {message && <Alert live>{message}</Alert>}
      {conflict && (
        <Button
          variant="outline"
          onClick={async () => {
            const signal = writeScope();
            if (signal.aborted) return;
            const next = await query.refetch();
            if (!signal.aborted && next.data && !next.isError) {
              setDraft(next.data);
              setConflict(false);
              setMessage('Đã tải tùy chọn hiện tại. Kiểm tra và chỉnh lại trước khi lưu.');
            }
          }}
        >
          Tải lại và dùng tùy chọn hiện tại
        </Button>
      )}
      <Button loading={busy} disabled={!draft || conflict} onClick={() => void save()}>
        Lưu tùy chọn
      </Button>
    </div>
  );
}
