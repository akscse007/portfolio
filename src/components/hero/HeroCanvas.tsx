'use client';

import { useEffect, useRef } from 'react';

type RGB = [number, number, number];

function readColor(name: string, fallback: RGB): RGB {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = v.split(/\s+/).map(Number);
  return parts.length === 3 && parts.every((n) => Number.isFinite(n)) ? (parts as RGB) : fallback;
}

/**
 * Mathematical field: particles advected through a smooth vector field,
 * a slowly morphing Lissajous figure and a faint coordinate frame.
 * - pauses off-screen and in background tabs
 * - adapts particle count to viewport/device
 * - draws a single still frame for reduced motion
 * - pointer bends the field on fine-pointer devices only
 */
export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const lowPower = (navigator.hardwareConcurrency ?? 4) <= 4;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let running = false;
    let visible = true;
    let raf = 0;
    let t = Math.random() * 100;
    const pointer = { x: -9999, y: -9999, active: false };

    let fg: RGB = readColor('--c-fg', [237, 234, 226]);
    let accent: RGB = readColor('--c-signal', [198, 244, 50]);
    let blue: RGB = readColor('--c-blue', [127, 178, 255]);
    let bg: RGB = readColor('--c-bg', [14, 15, 12]);

    type P = { x: number; y: number; life: number; max: number };
    let particles: P[] = [];

    const spawn = (p?: P): P => {
      const q = p ?? ({} as P);
      q.x = Math.random() * width;
      q.y = Math.random() * height;
      q.life = 0;
      q.max = 80 + Math.random() * 160;
      return q;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const area = width * height;
      const target = Math.round(Math.min(width < 640 ? 260 : lowPower ? 520 : 900, area / 1400));
      particles = Array.from({ length: target }, () => spawn());
      ctx.fillStyle = `rgb(${bg.join(',')})`;
      ctx.clearRect(0, 0, width, height);
    };

    const field = (x: number, y: number) => {
      const s = 0.0026;
      let ang =
        Math.sin(x * s + t * 0.12) * 1.6 +
        Math.cos(y * s * 1.3 - t * 0.09) * 1.4 +
        Math.sin((x + y) * s * 0.6 + t * 0.05);
      if (pointer.active) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const d2 = dx * dx + dy * dy;
        const r = 180;
        if (d2 < r * r) {
          // swirl around the pointer
          const swirl = (1 - Math.sqrt(d2) / r) * 2.2;
          ang += swirl;
        }
      }
      return ang;
    };

    const drawLissajous = (alpha: number) => {
      const cx = width * (width < 768 ? 0.5 : 0.7);
      const cy = height * 0.48;
      const R = Math.min(width, height) * (width < 768 ? 0.36 : 0.3);
      const a = 3;
      const b = 4;
      const delta = t * 0.08;
      ctx.beginPath();
      for (let i = 0; i <= 480; i++) {
        const u = (i / 480) * Math.PI * 2;
        const x = cx + R * Math.sin(a * u + delta);
        const y = cy + R * Math.sin(b * u);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${accent.join(',')},${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      // tracer point
      const u = (t * 0.25) % (Math.PI * 2);
      ctx.beginPath();
      ctx.arc(cx + R * Math.sin(a * u + delta), cy + R * Math.sin(b * u), 2.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${accent.join(',')},0.95)`;
      ctx.fill();
    };

    const drawFrame = (still = false) => {
      // trail fade
      ctx.fillStyle = `rgba(${bg.join(',')},${still ? 1 : 0.085})`;
      ctx.fillRect(0, 0, width, height);
      const steps = still ? 60 : 1;
      for (let s = 0; s < steps; s++) {
        ctx.beginPath();
        for (const p of particles) {
          const ang = field(p.x, p.y);
          const nx = p.x + Math.cos(ang) * 0.9;
          const ny = p.y + Math.sin(ang) * 0.9;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(nx, ny);
          p.x = nx;
          p.y = ny;
          p.life++;
          if (p.life > p.max || nx < 0 || ny < 0 || nx > width || ny > height) spawn(p);
        }
        ctx.strokeStyle = `rgba(${fg.join(',')},${still ? 0.05 : 0.22})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
      drawLissajous(still ? 0.55 : 0.5);
      // annotation crosshair
      ctx.strokeStyle = `rgba(${blue.join(',')},0.35)`;
      ctx.lineWidth = 1;
      const cx = width * (width < 768 ? 0.5 : 0.7);
      ctx.beginPath();
      ctx.moveTo(cx - 8, height * 0.48);
      ctx.lineTo(cx + 8, height * 0.48);
      ctx.moveTo(cx, height * 0.48 - 8);
      ctx.lineTo(cx, height * 0.48 + 8);
      ctx.stroke();
    };

    const loop = () => {
      if (!running) return;
      t += 0.016;
      drawFrame();
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reduced || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    if (reduced) drawFrame(true);
    else start();
    canvas.dataset.ready = 'true';

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) drawFrame(true);
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) start();
      else stop();
    });
    io.observe(canvas);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    if (finePointer && !reduced) {
      window.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerleave', onLeave);
    }

    const themeObserver = new MutationObserver(() => {
      fg = readColor('--c-fg', fg);
      accent = readColor('--c-signal', accent);
      blue = readColor('--c-blue', blue);
      bg = readColor('--c-bg', bg);
      ctx.clearRect(0, 0, width, height);
      if (reduced) drawFrame(true);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-slow data-[ready=true]:opacity-100"
    />
  );
}
