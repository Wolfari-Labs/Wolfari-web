import type { IconName } from '../../shared/components/Icon';

/**
 * Public Home copy for the product tour. Every line describes behaviour the app has today; no
 * user counts, ratings or promises (see docs/web-v2/CONTENT_RULES.md).
 */
export type HomeTone = 'blue' | 'amber' | 'green';

export interface HomeFeature {
  readonly title: string;
  readonly description: string;
  readonly icon: IconName;
}

export interface HomeFeatureGroup {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
  readonly tone: HomeTone;
  readonly features: readonly HomeFeature[];
}

export const homeFeatureGroups: readonly HomeFeatureGroup[] = [
  {
    id: 'plan',
    label: 'Lên kế hoạch',
    summary: 'Từ ý tưởng đến lịch trình từng ngày.',
    tone: 'blue',
    features: [
      {
        title: 'Chuyến đi của tôi',
        description: 'Tạo chuyến đi với ngày đi, ảnh bìa và lời mời — mọi chuyến nằm gọn một chỗ.',
        icon: 'luggage',
      },
      {
        title: 'Lịch trình theo ngày',
        description:
          'Kéo thả hoạt động giữa các ngày, giữ ý tưởng ở mục chưa xếp lịch, sắp xếp được cả bằng bàn phím.',
        icon: 'calendar',
      },
      {
        title: 'Bản đồ & địa điểm',
        description: 'Tìm và lưu địa điểm, thêm vào ngày phù hợp, xem lộ trình giữa các điểm dừng.',
        icon: 'map',
      },
    ],
  },
  {
    id: 'prepare',
    label: 'Chuẩn bị cùng nhau',
    summary: 'Ai mang gì, mặc gì, ai được sửa gì.',
    tone: 'amber',
    features: [
      {
        title: 'Dress code',
        description: 'Gợi ý trang phục cho cả chuyến, cho từng ngày hoặc từng hoạt động.',
        icon: 'dress',
      },
      {
        title: 'Hành lý chung',
        description: 'Checklist chung theo nhóm đồ, giao người phụ trách và xem tiến độ chuẩn bị.',
        icon: 'packing',
      },
      {
        title: 'Thành viên & lời mời',
        description:
          'Mời bạn đồng hành qua email, phân vai chủ chuyến hoặc thành viên, chọn ai được sửa lịch trình.',
        icon: 'userPlus',
      },
    ],
  },
  {
    id: 'money',
    label: 'Chi tiêu & cập nhật',
    summary: 'Tiền nhóm rõ ràng, giá vé không bỏ lỡ.',
    tone: 'green',
    features: [
      {
        title: 'Quỹ nhóm',
        description:
          'Ghi khoản góp, khoản chi và đối chiếu với người giữ quỹ để cả nhóm cùng nắm số dư.',
        icon: 'fund',
      },
      {
        title: 'Theo dõi giá vé',
        description:
          'Theo dõi một chặng bay, đặt ngưỡng giá và được báo khi giá ghi nhận chạm ngưỡng.',
        icon: 'price',
      },
      {
        title: 'Thông báo',
        description:
          'Cập nhật ngay trong ứng dụng hoặc qua thông báo trình duyệt, bật tắt theo ý bạn.',
        icon: 'bell',
      },
    ],
  },
];

export interface HomeShowcase {
  readonly id: string;
  readonly kicker: string;
  readonly title: string;
  readonly description: string;
  readonly tone: HomeTone;
  readonly points: readonly { readonly title: string; readonly text: string }[];
  readonly note?: string;
}

export const homeShowcases: readonly HomeShowcase[] = [
  {
    id: 'home-tour-plan',
    kicker: 'Lịch trình & bản đồ',
    title: 'Xếp lịch từng ngày, nhìn thấy cả lộ trình',
    description:
      'Mỗi ngày là một cột hoạt động rõ ràng. Ý tưởng chưa chốt nằm ở mục chưa xếp lịch, sẵn sàng được kéo vào ngày phù hợp.',
    tone: 'blue',
    points: [
      { title: 'Kéo thả hoặc dùng bàn phím', text: 'Đổi thứ tự, chuyển hoạt động sang ngày khác.' },
      { title: 'Tìm và lưu địa điểm', text: 'Lưu quán ăn, điểm tham quan rồi thêm vào lịch.' },
      { title: 'Lộ trình giữa các điểm', text: 'Xem đường đi giữa các điểm dừng trong ngày.' },
    ],
  },
  {
    id: 'home-tour-prepare',
    kicker: 'Hành lý, dress code & thành viên',
    title: 'Chuẩn bị chung, không ai phải nhắc ai',
    description:
      'Một checklist cho cả nhóm, gợi ý trang phục theo hoạt động và quyền rõ ràng cho từng người.',
    tone: 'amber',
    points: [
      { title: 'Giao việc theo món đồ', text: 'Mỗi món có người phụ trách và trạng thái đã xong.' },
      { title: 'Dress code theo ngày', text: 'Biết trước nên mặc gì cho buổi biển hay buổi tối.' },
      { title: 'Vai trò rõ ràng', text: 'Chủ chuyến mời thành viên và quyết định ai được sửa.' },
    ],
  },
  {
    id: 'home-tour-money',
    kicker: 'Quỹ nhóm, giá vé & thông báo',
    title: 'Tiền nhóm minh bạch, giá vé có người canh',
    description:
      'Ghi từng khoản góp và khoản chi, đối chiếu với người giữ quỹ. Đặt ngưỡng cho chặng bay và nhận thông báo khi giá chạm mức bạn chọn.',
    tone: 'green',
    points: [
      { title: 'Sổ quỹ chung', text: 'Đã góp, đã chi và còn lại — cả nhóm cùng xem.' },
      { title: 'Ngưỡng giá của riêng bạn', text: 'Wolfari theo dõi giá và báo bạn, không đặt vé.' },
      { title: 'Thông báo đúng lúc', text: 'Trong ứng dụng hoặc qua trình duyệt, tùy bạn chọn.' },
    ],
    note: 'Wolfari ghi nhận và đối chiếu, không giữ hoặc chuyển tiền thật.',
  },
];

export const homeSteps: readonly { readonly title: string; readonly text: string }[] = [
  { title: 'Tạo chuyến đi', text: 'Đặt tên, chọn ngày đi và ảnh bìa cho chuyến.' },
  { title: 'Mời cả nhóm', text: 'Gửi lời mời qua email và chọn vai trò cho từng người.' },
  {
    title: 'Lên kế hoạch cùng nhau',
    text: 'Xếp lịch, chia việc chuẩn bị, ghi quỹ và theo dõi giá vé.',
  },
];
