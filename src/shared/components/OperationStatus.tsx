import { useEffect, useSyncExternalStore } from 'react';
import type { CommandSession } from '../types/operations';
import { Alert } from './Alert';
import { Button } from './Button';

export function useCommandSession(session: CommandSession, onSettled: () => void) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  useEffect(() => {
    if (state.state === 'SUCCEEDED' || state.state === 'FAILED') onSettled();
  }, [state.state, state.intent?.key, onSettled]);
  useEffect(() => {
    if (!state.intent || !['PROCESSING', 'PENDING_RECOVERY'].includes(state.state)) return;
    let cancelled = false,
      timer: ReturnType<typeof setTimeout>;
    let count = 0;
    const poll = async () => {
      if (cancelled || count >= 6) return;
      count += 1;
      await session.check();
      if (!cancelled && ['PROCESSING', 'PENDING_RECOVERY'].includes(session.getSnapshot().state))
        timer = setTimeout(() => void poll(), Math.min(30000, 1000 * 2 ** count));
    };
    timer = setTimeout(() => void poll(), 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [session, state.intent?.key, state.state]);
  return state;
}
export function OperationStatus({
  session,
  onReenter,
}: {
  session: CommandSession;
  onReenter?: () => void;
}) {
  const s = useSyncExternalStore(session.subscribe, session.getSnapshot);
  if (s.recoveryBlocked)
    return (
      <Alert tone="error">
        Nhật ký phục hồi không khả dụng hoặc không hợp lệ. Đã chặn giao dịch mới để tránh gửi lặp.
        Giữ nguyên journal và liên hệ người vận hành để đối chiếu; không xóa dữ liệu trình duyệt để
        vượt chặn.
      </Alert>
    );
  if (!s.intent) return null;
  const messages = {
    IDLE: '',
    PROCESSING: 'Đang xử lý trên server. Chưa xác nhận hoàn tất.',
    PENDING_RECOVERY: 'Server đang chờ phục hồi. Không tạo lại giao dịch mới.',
    UNKNOWN: 'Chưa rõ kết quả ghi. Giữ nguyên yêu cầu; kiểm tra lại hoặc gửi lại đúng yêu cầu cũ.',
    SUCCEEDED: 'Server đã xác nhận hoàn tất. Dữ liệu đang được đọc lại.',
    FAILED: 'Server từ chối thao tác. Kiểm tra dữ liệu và quyền trước khi tạo yêu cầu mới.',
    NEEDS_REVIEW:
      'Thao tác cần đối soát. Không tự gửi lại hoặc tạo giao dịch thay thế; liên hệ người vận hành với mã thao tác.',
  };
  return (
    <section aria-label="Kết quả thao tác">
      <Alert
        tone={s.state === 'SUCCEEDED' ? 'success' : s.state === 'FAILED' ? 'error' : 'warning'}
        live
      >
        {messages[s.state]}
        {s.error?.code === 'FINANCE_OBLIGATION_BLOCKED' && (
          <p>
            Nghĩa vụ hoặc trách nhiệm quỹ chưa được giải quyết. Holder không thể rời quỹ đang mở;
            kiểm tra khoản đang báo chuyển và các nghĩa vụ khác. Server không cung cấp ID khoản nợ
            trong lỗi này.
          </p>
        )}
        {(s.error?.code === 'STATE_CONFLICT' || s.error?.code === 'VERSION_CONFLICT') && (
          <p>
            Dữ liệu đã thay đổi. Đọc lại và xác nhận bản nháp trước khi gửi yêu cầu mới; không tự
            ghi đè phiên bản.
          </p>
        )}
        {s.error?.code === 'PERMISSION_DENIED' && (
          <p>Bạn không còn quyền thực hiện. Tải lại quyền chuyến đi.</p>
        )}
        {s.error?.code === 'IDEMPOTENCY_CONFLICT' && (
          <p>Nội dung không khớp ý định ban đầu. Không đổi mã yêu cầu để vượt qua xung đột.</p>
        )}
      </Alert>
      <div className="demo-actions">
        <Button variant="outline" disabled={s.busy} onClick={() => void session.check()}>
          Kiểm tra lại kết quả
        </Button>
        {s.state === 'UNKNOWN' &&
          (s.intent.body ? (
            <Button disabled={s.busy} onClick={() => void session.retry()}>
              Gửi lại đúng yêu cầu
            </Button>
          ) : (
            onReenter && (
              <Button disabled={s.busy} onClick={onReenter}>
                Nhập lại để đối chiếu yêu cầu
              </Button>
            )
          ))}
        {['SUCCEEDED', 'FAILED'].includes(s.state) && (
          <Button variant="plain" disabled={s.busy} onClick={() => session.dismiss()}>
            Đã đọc kết quả
          </Button>
        )}
      </div>
      <details>
        <summary>Chi tiết hỗ trợ</summary>
        <p>
          Mã thao tác: {s.intent.key} · {s.state}
        </p>
        {s.error?.correlationId && <p>Mã tra cứu: {s.error.correlationId}</p>}
      </details>
    </section>
  );
}
