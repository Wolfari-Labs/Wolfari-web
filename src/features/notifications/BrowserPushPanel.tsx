import { useEffect, useSyncExternalStore } from 'react';
import type { BrowserPush } from './browser-push';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { Globe } from 'lucide-react';
import styles from './Notifications.module.css';
const labels = {
  'missing-config':
    'Chưa cấu hình Firebase cho môi trường này. Chức năng đăng ký push chưa khả dụng.',
  unsupported: 'Trình duyệt chưa hỗ trợ push hoặc website chưa dùng HTTPS/localhost.',
  idle: 'Chưa đăng ký thông báo trên trình duyệt này.',
  denied:
    'Quyền thông báo đang bị chặn. Mở cài đặt quyền của website trong trình duyệt để thay đổi.',
  registered: 'Đã đăng ký trình duyệt này.',
  error: 'Chưa xác nhận được trạng thái đăng ký.',
};
export function BrowserPushPanel({ service, actor }: { service: BrowserPush; actor: string }) {
  const state = useSyncExternalStore(service.subscribe, service.getSnapshot);
  useEffect(() => {
    service.activate(actor);
    const refresh = () => {
      if (!document.hidden && !service.getSnapshot().busy) {
        service.suspend();
        service.activate(actor);
      }
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [service, actor]);
  const unavailable = ['missing-config', 'unsupported', 'denied'].includes(state.state);
  return (
    <fieldset className={styles.device}>
      <legend className={styles.deviceTitle}>Thông báo trên trình duyệt này</legend>
      <span className={styles.deviceBadge} aria-hidden="true">
        <Globe size={22} strokeWidth={2.2} />
      </span>
      <span className={styles.deviceTag}>Thiết bị này</span>
      <Alert tone={state.state === 'error' ? 'warning' : 'info'} live>
        {state.busy ? 'Đang cập nhật đăng ký…' : state.message || labels[state.state]}
      </Alert>
      <p className={styles.deviceNote}>
        Đăng ký thiết bị khác với tùy chọn “Cho phép push”. Lưu thiết bị thành công không có nghĩa
        backend đã gửi hoặc trình duyệt đã nhận thông báo.
      </p>
      <div className={styles.deviceActions}>
        <Button
          size="compact"
          disabled={state.busy || unavailable}
          onClick={() => void service.enable(actor)}
        >
          {state.state === 'registered' || state.state === 'error'
            ? 'Cập nhật đăng ký trình duyệt'
            : 'Bật thông báo trình duyệt'}
        </Button>
        <Button
          variant="outline"
          size="compact"
          disabled={state.busy || state.state === 'missing-config' || state.state === 'unsupported'}
          onClick={() => void service.disconnect()}
        >
          Tắt đăng ký trình duyệt
        </Button>
      </div>
      <p className={styles.deviceNote}>
        Nếu dùng máy chung, hãy tắt đăng ký trước khi rời máy. Việc tắt không thay đổi quyền thông
        báo bạn đã cấp trong cài đặt trình duyệt.
      </p>
    </fieldset>
  );
}
