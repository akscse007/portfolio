'use client';

import { useEffect, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * GSAP scenes must be created and reverted in a *layout* effect: React removes DOM nodes before
 * running passive-effect cleanups, so a ScrollTrigger pin (which re-parents its element into a
 * pin-spacer) reverted from useEffect is still in place when React calls removeChild — throwing
 * "Failed to execute 'removeChild' on 'Node'" on client-side navigation.
 */
export const useGsapEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

let registered = false;

/** Single registration point: ScrollTrigger is the only scroll controller in the app (native scrolling). */
export function getGsap() {
  if (!registered && typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    registered = true;
  }
  return { gsap, ScrollTrigger };
}

/** Desktop scenes: large viewport, fine pointer not required, reduced motion respected. */
export const DESKTOP_MOTION = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';
export const ANY_MOTION = '(prefers-reduced-motion: no-preference)';
