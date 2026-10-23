import type { QueryClient } from '@tanstack/react-query';
import type { DomainError } from '../../shared/types/result';
export function invitationErrorMessage(error: DomainError): string {
  switch (error.code) {
    case 'UNAUTHENTICATED':
      return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.';
    case 'PERMISSION_DENIED':
      return 'Tài khoản hiện tại không có quyền thực hiện thao tác.';
    case 'RESOURCE_NOT_FOUND':
    case 'STATE_CONFLICT':
      return 'Lời mời không khả dụng hoặc trạng thái đã thay đổi. Kiểm tra đúng tài khoản, email đã xác minh và liên kết gốc.';
    case 'VERSION_CONFLICT':
      return 'Dữ liệu đã thay đổi. Hãy kiểm tra dữ liệu mới và xác nhận lại thao tác.';
    case 'IDEMPOTENCY_CONFLICT':
      return 'Yêu cầu không khớp với lần gửi trước. Hãy kiểm tra lại dữ liệu.';
    case 'RESOURCE_EXHAUSTED':
      return 'Có quá nhiều yêu cầu. Vui lòng chờ rồi thử lại.';
    case 'VALIDATION_FAILED':
      return 'Thông tin lời mời không hợp lệ. Hãy kiểm tra lại.';
    default:
      return 'Chưa xác định được kết quả. Thử lại sẽ giữ nguyên yêu cầu trước; không tạo lời mời mới.';
  }
}
export async function refreshInvitationProjections(client: QueryClient, tripId?: string) {
  const scoped = (prefix: string) => (tripId ? [prefix, tripId] : [prefix]);
  await Promise.all([
    client.invalidateQueries({ queryKey: tripId ? ['trip', 'detail', tripId] : ['trip'] }),
    ...['members', 'plan', 'shell', 'invitations'].map((prefix) =>
      client.invalidateQueries({ queryKey: scoped(prefix) }),
    ),
    client.invalidateQueries({ queryKey: ['trips', 'list'] }),
  ]);
}
