import { useEffect, useSyncExternalStore } from 'react';
import type { BrowserPush } from './browser-push';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import styles from './Notifications.module.css';
const labels = {
  'missing-config': 'Thông báo trên trình duyệt chưa được thiết lập cho môi trường này.',
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
      <legend>Thông báo trên trình duyệt này</legend>
      <Alert tone={state.state === 'error' ? 'warning' : 'info'} live>
        {state.busy ? 'Đang cập nhật đăng ký…' : state.message || labels[state.state]}
      </Alert>
      <p className={styles.deviceNote}>
        Đăng ký thiết bị là bước riêng với tùy chọn “Cho phép push” và không đảm bảo trình duyệt đã
        nhận được thông báo.
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
