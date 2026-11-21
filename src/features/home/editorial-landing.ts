import daNang from '../../shared/assets/figma/1dc61.png';
import phuQuoc from '../../shared/assets/figma/a84f7.png';
import daLat from '../../shared/assets/figma/6059f.png';
import hoiAn from '../../shared/assets/v2/destination-hoian.jpg';
import type { HomeLandingViewModel } from './model/home';
/**
 * Public editorial content (Figma 933:7861 "Điểm đến được yêu thích"), not user trips, reviews,
 * popularity data, or simulated API data.
 */
export const editorialLanding: HomeLandingViewModel = {
  inspiration: null,
  stories: [
    {
      name: 'Đà Nẵng',
      duration: 'Biển · 3N2Đ',
      cover: { src: daNang, alt: 'Ảnh minh họa biển Đà Nẵng' },
    },
    {
      name: 'Phú Quốc',
      duration: 'Đảo · 4N3Đ',
      cover: { src: phuQuoc, alt: 'Ảnh minh họa đảo Phú Quốc' },
    },
    {
      name: 'Đà Lạt',
      duration: 'Núi · 3N2Đ',
      cover: { src: daLat, alt: 'Ảnh minh họa đồi núi Đà Lạt' },
    },
    {
      name: 'Hội An',
      duration: 'Phố cổ · 2N1Đ',
      cover: { src: hoiAn, alt: 'Ảnh minh họa Hội An' },
    },
  ],
};
