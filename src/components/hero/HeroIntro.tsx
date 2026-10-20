'use client';

import { useGsapEffect } from '@/components/motion/gsap';
import { gsap } from 'gsap';

/**
 * Opening choreography: masked headline lines rise in sequence, then supporting
 * content fades up. Initial hidden states are applied by CSS only under `html.js-motion`,
 * so the hero is fully readable without JS or with reduced motion.
 */
export function HeroIntro() {
  useGsapEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains('js-motion')) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.fromTo(
        '[data-hero-line] > span',
        { yPercent: 105, y: 0 },
        { yPercent: 0, duration: 1.2, stagger: 0.09 },
        0.1,
      )
        .fromTo(
          '[data-hero-fade]',
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 1, stagger: 0.08 },
          0.55,
        )
        .fromTo('[data-hero-meta]', { opacity: 0 }, { opacity: 1, duration: 0.8 }, 0.2);
    });
    root.classList.add('hero-ready');
    return () => ctx.revert();
  }, []);
  return null;
}
