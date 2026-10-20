'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type DrawContext = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** seconds since start (frozen while paused) */
  t: number;
  dt: number;
  colors: {
    fg: string;
    muted: string;
    line: string;
    accent: string;
    blue: string;
    bg: string;
    danger: string;
  };
};

function cssColor(name: string, alpha = 1) {
  const v =
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '128 128 128';
  return `rgb(${v.split(/\s+/).join(' ')} / ${alpha})`;
}

function readColors(): DrawContext['colors'] {
  return {
    fg: cssColor('--c-fg'),
    muted: cssColor('--c-muted'),
    line: cssColor('--c-line'),
    accent: cssColor('--c-signal'),
    blue: cssColor('--c-blue'),
    bg: cssColor('--c-bg'),
    danger: cssColor('--c-danger'),
  };
}

/**
 * Shared canvas loop for playground visualisations:
 * - devicePixelRatio-aware sizing via ResizeObserver
 * - pauses when off-screen, in background tabs, or when the user pauses
 * - reduced motion: starts paused (a single frame is drawn; users may still press play)
 * - re-reads theme colours when the theme changes
 */
export function useCanvas(
  draw: (d: DrawContext) => void,
  { animate = true }: { animate?: boolean } = {},
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const state = useRef({
    t: 0,
    last: 0,
    visible: true,
    width: 0,
    height: 0,
    colors: null as DrawContext['colors'] | null,
  });

  const render = useCallback((dt = 0) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const s = state.current;
    s.colors ??= readColors();
    ctx.save();
    ctx.clearRect(0, 0, s.width, s.height);
    drawRef.current({ ctx, width: s.width, height: s.height, t: s.t, dt, colors: s.colors });
    ctx.restore();
  }, []);

  useEffect(() => {
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReduced(rm);
    setPlaying(animate && !rm);
  }, [animate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.current.width = r.width;
      state.current.height = r.height;
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      state.current.visible = Boolean(e?.isIntersecting);
    });
    io.observe(canvas);
    const mo = new MutationObserver(() => {
      state.current.colors = readColors();
      render();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    resize();
    canvas.dataset.ready = 'true';
    return () => {
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
    };
  }, [render]);

  useEffect(() => {
    if (!playing) {
      render();
      return;
    }
    let raf = 0;
    state.current.last = performance.now();
    const loop = (now: number) => {
      const s = state.current;
      const dt = Math.min(0.05, (now - s.last) / 1000);
      s.last = now;
      if (s.visible && !document.hidden) {
        s.t += dt;
        render(dt);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, render]);

  // While paused, redraw after every React render so control changes are visible immediately.
  useEffect(() => {
    if (!playing) render();
  });

  const reset = useCallback(() => {
    state.current.t = 0;
    render();
  }, [render]);

  return { canvasRef, playing, setPlaying, reset, redraw: render, reduced };
}
