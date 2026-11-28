import type { HomeLandingViewModel, HomeRepository } from '../../features/home/model/home';
import daNang from '../../shared/assets/figma/home-auth/1dc61.png';
import phuQuoc from '../../shared/assets/figma/a84f7.png';
import daLat from '../../shared/assets/figma/6059f.png';
import hoiAn from '../../shared/assets/figma/home-auth/06bd1.png';
import coast from '../../shared/assets/figma/e73d3.svg';
const landing: HomeLandingViewModel = {
  inspiration: {
    title: 'Biển xanh gọi tên',
    subtitle: 'Sơn Trà · Đà Nẵng · Một ngày thảnh thơi',
    cover: { src: coast, alt: '' },
  },
  stories: [
    {
      name: 'Đà Nẵng',
      duration: 'Biển · 3N2Đ',
      cover: { src: daNang, alt: '' },
    },
    {
      name: 'Phú Quốc',
      duration: 'Đảo · 4N3Đ',
      cover: { src: phuQuoc, alt: '' },
    },
    {
      name: 'Đà Lạt',
      duration: 'Núi · 3N2Đ',
      cover: { src: daLat, alt: '' },
    },
    {
      name: 'Hội An',
      duration: 'Phố cổ · 2N1Đ',
      cover: { src: hoiAn, alt: '' },
    },
  ],
};
export function createFixtureHomeRepository(): HomeRepository {
  return {
    async readLanding({ scenario, signal }) {
      signal.throwIfAborted();
      if (scenario === 'loading')
        return new Promise((_, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
        );
      if (scenario === 'empty') return { status: 'empty' };
      if (scenario === 'success') return { status: 'ready', data: structuredClone(landing) };
      return {
        status: 'error',
        error: {
          code:
            scenario === 'forbidden'
              ? 'PERMISSION_DENIED'
              : scenario === 'not-found'
                ? 'RESOURCE_NOT_FOUND'
                : scenario === 'conflict'
                  ? 'VERSION_CONFLICT'
                  : 'SERVICE_UNAVAILABLE',
          correlationId: 'fixture-home',
          retryable: scenario === 'error',
        },
      };
    },
  };
}
