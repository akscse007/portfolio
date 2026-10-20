'use client';

import { useEffect, useRef } from 'react';

/** A hairline progress bar tied to the real document scroll position. */
export function ScrollProgress({ target }: { target?: string }) {
  const barRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let progress: number;
      const el = document.querySelector<HTMLElement>(target ?? '[data-progress-target]');
      if (el) {
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
      } else {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
      if (valueRef.current)
        valueRef.current.textContent = String(Math.round(progress * 100)).padStart(3, '0');
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [target]);

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]">
        <div
          ref={barRef}
          className="h-full origin-left bg-signal"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-4 right-4 z-30 hidden font-mono text-mono-xs text-muted md:block"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <span ref={valueRef}>000</span>
        <span className="text-accent">%</span>
      </div>
    </>
  );
}
