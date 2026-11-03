import beach from '../../shared/assets/figma/3a3f8.png';
import explore from '../../shared/assets/figma/42524.png';
import friends from '../../shared/assets/figma/6059f.png';
import type { HomeLandingViewModel } from './model/home';
/** Public editorial content, not user trips, reviews, or simulated API data. */
export const editorialLanding: HomeLandingViewModel = {
  inspiration: null,
  stories: [
    {
      name: 'Một ngày bên biển',
      duration: 'Cảm hứng nghỉ ngơi',
      cover: { src: beach, alt: 'Ảnh minh họa cảm hứng du lịch biển' },
    },
    {
      name: 'Những góc phố mới',
      duration: 'Cảm hứng khám phá',
      cover: { src: explore, alt: 'Ảnh minh họa hành trình khám phá' },
    },
    {
      name: 'Đi cùng những người bạn',
      duration: 'Cảm hứng kết nối',
      cover: { src: friends, alt: 'Ảnh minh họa chuyến đi cùng bạn bè' },
    },
  ],
};
