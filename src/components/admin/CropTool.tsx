'use client';

import { useEffect, useRef, useState } from 'react';

export type CropBox = { x: number; y: number; width: number; height: number };

/**
 * Select a rectangular region of an image (fractions 0..1). Pointer drag to draw a new box,
 * or use the numeric inputs (keyboard-accessible). Used to make redacted/cropped public previews.
 */
export function CropTool({
  src,
  alt,
  onCrop,
  busy,
}: {
  src: string;
  alt: string;
  onCrop: (box: CropBox) => void;
  busy?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<CropBox>({ x: 0, y: 0, width: 1, height: 1 });
  const drag = useRef<{ x0: number; y0: number } | null>(null);

  const rel = (e: React.PointerEvent) => {
    const r = wrap.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  useEffect(() => setBox({ x: 0, y: 0, width: 1, height: 1 }), [src]);

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const setField = (k: keyof CropBox, v: number) =>
    setBox((b) => {
      const n = { ...b, [k]: Math.min(1, Math.max(0, v / 100)) };
      n.width = Math.min(n.width, 1 - n.x);
      n.height = Math.min(n.height, 1 - n.y);
      return n;
    });

  return (
    <div>
      <div
        ref={wrap}
        className="relative touch-none select-none overflow-hidden rounded-sm border border-line bg-bg"
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          const p = rel(e);
          drag.current = { x0: p.x, y0: p.y };
          setBox({ x: p.x, y: p.y, width: 0.001, height: 0.001 });
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const p = rel(e);
          const { x0, y0 } = drag.current;
          setBox({
            x: Math.min(x0, p.x),
            y: Math.min(y0, p.y),
            width: Math.abs(p.x - x0),
            height: Math.abs(p.y - y0),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
          setBox((b) =>
            b.width < 0.02 || b.height < 0.02 ? { x: 0, y: 0, width: 1, height: 1 } : b,
          );
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="block h-auto w-full" draggable={false} />
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute border-2 border-signal"
            style={{
              left: pct(box.x),
              top: pct(box.y),
              width: pct(box.width),
              height: pct(box.height),
              boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.55)',
            }}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">
        Drag across the image to select the area to publish (e.g. exclude ID numbers or signatures).
      </p>
      <fieldset className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <legend className="sr-only">Crop box in percent</legend>
        {(['x', 'y', 'width', 'height'] as const).map((k) => (
          <label key={k} className="text-xs">
            <span className="label block">{k} %</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="input mt-1"
              value={(box[k] * 100).toFixed(1)}
              onChange={(e) => setField(k, Number(e.target.value))}
            />
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        className="btn-primary btn-sm mt-4"
        disabled={busy}
        onClick={() => onCrop(box)}
      >
        {busy ? 'Creating preview…' : 'Create public preview from selection'}
      </button>
    </div>
  );
}
