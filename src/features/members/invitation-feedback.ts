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
/**
 * Recipient wording. A 404 means "no invitation for this account" (EMAIL is bound to the verified
 * address) or, for a typed code, a wrong/expired code; the Gateway limits wrong codes.
 */
export function recipientInvitationErrorMessage(error: DomainError, byCode: boolean): string {
  if (error.code === 'RESOURCE_NOT_FOUND')
    return byCode
      ? 'Không tìm thấy lời mời với mã này. Kiểm tra lại mã hoặc xin Owner một mã mới.'
      : 'Không tìm thấy lời mời cho tài khoản này — đăng nhập đúng email đã nhận lời mời và xác minh email.';
  if (error.code === 'RESOURCE_EXHAUSTED' && byCode)
    return 'Nhập sai mã mời quá nhiều lần. Chờ khoảng 15 phút rồi thử lại.';
  return invitationErrorMessage(error);
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
