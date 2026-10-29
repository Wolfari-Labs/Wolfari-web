import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
const features = () => import('./motion-features').then((module) => module.default);
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={features} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
