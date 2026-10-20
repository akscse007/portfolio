'use client';

import { useCanvas } from './useCanvas';

/** Small decorative Lissajous for the home page teaser (pauses off-screen / reduced motion). */
export function MiniLissajous() {
  const { canvasRef } = useCanvas(({ ctx, width, height, t, colors }) => {
    const cx = width / 2;
    const cy = height / 2;
    const R = Math.min(width, height) * 0.38;
    const a = 5;
    const b = 4;
    const d = t * 0.35;
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - R - 12, cy);
    ctx.lineTo(cx + R + 12, cy);
    ctx.moveTo(cx, cy - R - 12);
    ctx.lineTo(cx, cy + R + 12);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= 720; i++) {
      const u = (i / 720) * Math.PI * 2;
      const x = cx + R * Math.sin(a * u + d);
      const y = cy + R * Math.sin(b * u);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = colors.blue;
    ctx.font = '11px ui-monospace, monospace';
    ctx.fillText(`x = sin(5t + ${(d % (2 * Math.PI)).toFixed(2)})`, 12, height - 30);
    ctx.fillText('y = sin(4t)', 12, height - 14);
  });
  return (
    <div className="relative aspect-square w-full max-w-xl justify-self-center overflow-hidden rounded-sm border border-line bg-surface/50 grid-lines">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
    </div>
  );
}
