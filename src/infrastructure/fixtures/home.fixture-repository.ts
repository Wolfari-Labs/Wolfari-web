import type { HomeLandingViewModel, HomeRepository } from '../../features/home/model/home';
import daNang from '../../shared/assets/figma/3a3f8.png';
import phuQuoc from '../../shared/assets/figma/a84f7.png';
import daLat from '../../shared/assets/figma/6059f.png';
import saiGon from '../../shared/assets/figma/42524.png';
import coast from '../../shared/assets/figma/e73d3.svg';
const landing: HomeLandingViewModel = {
  inspiration: {
    title: 'Biển xanh gọi tên',
    subtitle: 'Sơn Trà · Đà Nẵng · Một ngày thảnh thơi',
    cover: { src: coast, alt: '' },
  },
  stories: [
    {
      name: 'Đà Nẵng – Hội An – Bà Nà',
      duration: '4 ngày 3 đêm · 2–6 người',
      cover: { src: daNang, alt: '' },
    },
    {
      name: 'Phú Quốc – Thiên đường biển đảo',
      duration: '4 ngày 2 đêm · 2–6 người',
      cover: { src: phuQuoc, alt: '' },
    },
    {
      name: 'Đà Lạt mộng mơ',
      duration: '3 ngày 2 đêm · 2–5 người',
      cover: { src: daLat, alt: '' },
    },
    {
      name: 'Sài Gòn – Vũng Tàu',
      duration: '3 ngày 2 đêm · 2–6 người',
      cover: { src: saiGon, alt: '' },
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
