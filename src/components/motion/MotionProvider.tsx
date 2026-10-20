'use client';

import { MotionConfig } from 'motion/react';
import { useEffect, type ReactNode } from 'react';

/** Global motion settings: Motion respects the user's reduced-motion preference. */
export function MotionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Hydration succeeded: disable the CSS reveal failsafe.
    document.documentElement.classList.add('reveal-ready');
  }, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
