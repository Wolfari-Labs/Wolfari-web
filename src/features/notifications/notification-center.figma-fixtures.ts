import type { NotificationCenterModel } from './NotificationCenter';

/** Imported only by the explicit design-preview entry, never by a runtime route. */
export const notificationCenterFigma: NotificationCenterModel = {
  unread: 5, today: 3, week: 12,
  items: [
    { id: 'invite', category: 'invitation', title: 'Bạn được mời tham gia Đà Nẵng 3N2Đ', body: 'Trang Nguyễn đã gửi lời mời tham gia chuyến đi.', time: 'Vừa xong', createdAt: '2026-10-10T10:00:00+07:00', read: false, destination: '/invitations/local' },
    { id: 'plan', category: 'plan', title: 'Lịch trình ngày 1 vừa thay đổi', body: 'Bãi biển Mỹ Khê được chuyển sang 15:00.', time: '12 phút trước', createdAt: '2026-10-10T09:48:00+07:00', read: false },
    { id: 'packing', category: 'packing', title: 'Bạn được giao chuẩn bị Sạc dự phòng', body: 'Hạn chuẩn bị trước ngày 11/10/2026.', time: '1 giờ trước', createdAt: '2026-10-10T09:00:00+07:00', read: false },
    { id: 'finance', category: 'finance', title: 'Khoản đóng góp sắp đến hạn', body: 'Kiểm tra nghĩa vụ đóng góp của bạn trong Quỹ nhóm.', time: 'Hôm qua', createdAt: '2026-10-09T10:00:00+07:00', read: false },
    { id: 'price', category: 'price', title: 'Giá vé Đà Nẵng → Hà Nội đã giảm', body: 'Price Watch ghi nhận mức giá mới theo yêu cầu theo dõi.', time: 'Hôm qua', createdAt: '2026-10-09T10:00:00+07:00', read: false },
  ],
};
export const notificationCenterReadFigma: NotificationCenterModel = {
  ...notificationCenterFigma, unread: 0, items: notificationCenterFigma.items.map(item => ({ ...item, read: true })),
};
