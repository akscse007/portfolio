'use client';

import type { ReactNode, RefObject } from 'react';
import { cn } from '@/lib/utils';

/**
 * Common frame for every playground visualisation: explanation, canvas stage with
 * a static SVG fallback (shown without JS / before hydration), and accessible controls.
 */
export function Shell({
  id,
  index,
  title,
  explanation,
  canvasRef,
  canvasLabel,
  fallback,
  controls,
  playing,
  onTogglePlay,
  onReset,
  readout,
  ratio = '4 / 3',
  onCanvasPointer,
  onCanvasKey,
}: {
  id: string;
  index: string;
  title: string;
  explanation: ReactNode;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasLabel: string;
  fallback: ReactNode;
  controls: ReactNode;
  playing?: boolean;
  onTogglePlay?: () => void;
  onReset: () => void;
  readout?: ReactNode;
  ratio?: string;
  onCanvasPointer?: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onCanvasKey?: (e: React.KeyboardEvent<HTMLCanvasElement>) => void;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 border-t border-line py-16 md:py-24"
    >
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="font-mono text-mono-xs text-accent">{index}</p>
          <h2
            id={`${id}-title`}
            className="mt-2 font-display text-3xl font-bold uppercase leading-none md:text-4xl"
            style={{ fontStretch: '76%' }}
          >
            {title}
          </h2>
          <div className="mt-5 space-y-4 text-fg/85 [&_.katex-display]:my-3 [&_.katex-display]:overflow-x-auto">
            {explanation}
          </div>
        </div>
        <div className="lg:col-span-7">
          <div
            className="relative overflow-hidden rounded-sm border border-line bg-surface/60"
            style={{ aspectRatio: ratio }}
          >
            <div className="absolute inset-0" aria-hidden>
              {fallback}
            </div>
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={canvasLabel}
              tabIndex={onCanvasKey ? 0 : -1}
              onPointerDown={onCanvasPointer}
              onKeyDown={onCanvasKey}
              className={cn(
                'absolute inset-0 h-full w-full bg-surface opacity-0 data-[ready=true]:opacity-100',
                onCanvasPointer && 'cursor-crosshair touch-none',
              )}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {onTogglePlay && (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={onTogglePlay}
                aria-pressed={playing}
              >
                {playing ? 'Pause' : 'Play'}
              </button>
            )}
            <button type="button" className="btn-ghost btn-sm" onClick={onReset}>
              Reset
            </button>
            {readout && (
              <output className="ml-auto font-mono text-mono-sm text-blue" aria-live="polite">
                {readout}
              </output>
            )}
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">{controls}</div>
        </div>
      </div>
    </section>
  );
}

export function Slider({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v: number) => String(v),
}: {
  id: string;
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label">
          {label}
        </label>
        <span className="font-mono text-mono-sm tabular-nums text-fg">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-11 w-full cursor-pointer accent-[rgb(var(--c-signal))]"
      />
    </div>
  );
}

export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className="label mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className="chip"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Maps math coordinates to canvas pixels for a centred viewport. */
export function viewport(width: number, height: number, xRange: number, yRange?: number) {
  const yr = yRange ?? (xRange * height) / width;
  const sx = width / (2 * xRange);
  const sy = height / (2 * yr);
  return {
    toX: (x: number) => width / 2 + x * sx,
    toY: (y: number) => height / 2 - y * sy,
    fromX: (px: number) => (px - width / 2) / sx,
    fromY: (py: number) => (height / 2 - py) / sy,
    xRange,
    yRange: yr,
    sx,
    sy,
  };
}

export function drawAxes(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  vp: ReturnType<typeof viewport>,
  colors: { line: string; muted: string },
  step = 1,
) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = colors.line;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  for (let x = Math.ceil(-vp.xRange / step) * step; x <= vp.xRange; x += step) {
    ctx.moveTo(vp.toX(x), 0);
    ctx.lineTo(vp.toX(x), height);
  }
  for (let y = Math.ceil(-vp.yRange / step) * step; y <= vp.yRange; y += step) {
    ctx.moveTo(0, vp.toY(y));
    ctx.lineTo(width, vp.toY(y));
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = colors.muted;
  ctx.beginPath();
  ctx.moveTo(0, vp.toY(0));
  ctx.lineTo(width, vp.toY(0));
  ctx.moveTo(vp.toX(0), 0);
  ctx.lineTo(vp.toX(0), height);
  ctx.stroke();
}

/** Static SVG polyline used as a no-JS fallback. Points in [-1,1]² (y up). */
export function FallbackPlot({ points, caption }: { points: [number, number][]; caption: string }) {
  const d = points
    .map(([x, y]) => `${(50 + x * 45).toFixed(2)},${(37.5 - y * 33).toFixed(2)}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 75" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="rgb(var(--c-line))" strokeWidth="0.3" />
      <line x1="50" y1="0" x2="50" y2="75" stroke="rgb(var(--c-line))" strokeWidth="0.3" />
      <polyline points={d} fill="none" stroke="rgb(var(--c-signal))" strokeWidth="0.6" />
      <text x="3" y="71" fontSize="3" fill="rgb(var(--c-muted))" fontFamily="monospace">
        {caption}
      </text>
    </svg>
  );
}
