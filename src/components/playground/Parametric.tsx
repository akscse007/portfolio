'use client';

import { useState, type ReactNode } from 'react';
import { useCanvas } from './useCanvas';
import { Choice, FallbackPlot, Shell, Slider } from './Shell';

type Mode = 'lissajous' | 'rose' | 'epitrochoid';

function point(mode: Mode, u: number, a: number, b: number, delta: number): [number, number] {
  if (mode === 'lissajous') return [Math.sin(a * u + delta), Math.sin(b * u)];
  if (mode === 'rose') {
    const k = a / b;
    const r = Math.cos(k * u + delta);
    return [r * Math.cos(u), r * Math.sin(u)];
  }
  // epitrochoid with R = a, r = b, d = 0.8b (normalised)
  const R = a;
  const r = b;
  const d = r * 0.8;
  const s = R + r + d;
  return [
    ((R + r) * Math.cos(u) - d * Math.cos(((R + r) / r) * u + delta)) / s,
    ((R + r) * Math.sin(u) - d * Math.sin(((R + r) / r) * u + delta)) / s,
  ];
}

const FALLBACK = Array.from({ length: 401 }, (_, i) => {
  const u = (i / 400) * Math.PI * 2;
  return [Math.sin(3 * u + Math.PI / 2), Math.sin(2 * u)] as [number, number];
});

export function Parametric({ explanation }: { explanation: ReactNode }) {
  const [mode, setMode] = useState<Mode>('lissajous');
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const [delta, setDelta] = useState(Math.PI / 2);
  const [spin, setSpin] = useState(true);

  const { canvasRef, playing, setPlaying, reset } = useCanvas(
    ({ ctx, width, height, t, colors }) => {
      const R = Math.min(width, height) * 0.42;
      const cx = width / 2;
      const cy = height / 2;
      const d = delta + (spin ? t * 0.4 : 0);
      ctx.strokeStyle = colors.line;
      ctx.beginPath();
      ctx.moveTo(cx - R, cy);
      ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R);
      ctx.lineTo(cx, cy + R);
      ctx.stroke();
      const turns = mode === 'lissajous' ? 1 : mode === 'rose' ? b : b;
      const N = 1600;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const u = (i / N) * Math.PI * 2 * turns;
        const [x, y] = point(mode, u, a, b, d);
        if (i) ctx.lineTo(cx + x * R, cy - y * R);
        else ctx.moveTo(cx + x * R, cy - y * R);
      }
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // tracer
      const u = (t * 0.8) % (Math.PI * 2 * turns);
      const [x, y] = point(mode, u, a, b, d);
      ctx.fillStyle = colors.blue;
      ctx.beginPath();
      ctx.arc(cx + x * R, cy - y * R, 4, 0, Math.PI * 2);
      ctx.fill();
    },
  );

  return (
    <Shell
      id="parametric"
      index="01"
      title="Parametric curves"
      explanation={explanation}
      canvasRef={canvasRef}
      canvasLabel={`${mode} curve with a = ${a}, b = ${b}`}
      fallback={<FallbackPlot points={FALLBACK} caption="Lissajous a=3, b=2 (static preview)" />}
      playing={playing}
      onTogglePlay={() => setPlaying(!playing)}
      onReset={() => {
        setMode('lissajous');
        setA(3);
        setB(2);
        setDelta(Math.PI / 2);
        setSpin(true);
        reset();
      }}
      readout={`a:b = ${a}:${b}`}
      controls={
        <>
          <Choice
            label="Family"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'lissajous', label: 'Lissajous' },
              { value: 'rose', label: 'Rose' },
              { value: 'epitrochoid', label: 'Epitrochoid' },
            ]}
          />
          <Slider id="par-a" label="a" value={a} min={1} max={9} onChange={setA} />
          <Slider id="par-b" label="b" value={b} min={1} max={9} onChange={setB} />
          <Slider
            id="par-d"
            label="phase δ"
            value={delta}
            min={0}
            max={Math.PI}
            step={0.01}
            onChange={setDelta}
            format={(v) => `${(v / Math.PI).toFixed(2)}π`}
          />
          <label className="flex min-h-11 items-center gap-3 self-end">
            <input
              type="checkbox"
              checked={spin}
              onChange={(e) => setSpin(e.target.checked)}
              className="h-5 w-5 accent-[rgb(var(--c-signal))]"
            />
            <span className="label">Animate phase</span>
          </label>
        </>
      }
    />
  );
}
