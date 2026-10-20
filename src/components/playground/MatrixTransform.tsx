'use client';

import { useState, type ReactNode } from 'react';
import { useCanvas } from './useCanvas';
import { Choice, Shell, Slider, viewport } from './Shell';

type M = [number, number, number, number]; // [a, b, c, d] for [[a, b], [c, d]]
const PRESETS: Record<string, { label: string; m: M }> = {
  identity: { label: 'Identity', m: [1, 0, 0, 1] },
  rotation: { label: 'Rotate 45°', m: [Math.SQRT1_2, -Math.SQRT1_2, Math.SQRT1_2, Math.SQRT1_2] },
  shear: { label: 'Shear', m: [1, 1, 0, 1] },
  scale: { label: 'Scale', m: [1.6, 0, 0, 0.6] },
  reflect: { label: 'Reflect', m: [1, 0, 0, -1] },
  singular: { label: 'Singular', m: [1, 2, 0.5, 1] },
};

function eigen([a, b, c, d]: M) {
  const tr = a + d;
  const det = a * d - b * c;
  const disc = tr * tr - 4 * det;
  if (disc < -1e-9) {
    const re = tr / 2;
    const im = Math.sqrt(-disc) / 2;
    return {
      real: false as const,
      values: [re, im] as [number, number],
      vectors: [] as [number, number][],
    };
  }
  const s = Math.sqrt(Math.max(0, disc));
  const l1 = (tr + s) / 2;
  const l2 = (tr - s) / 2;
  const vec = (l: number): [number, number] => {
    let v: [number, number] =
      Math.abs(b) > 1e-9 ? [b, l - a] : Math.abs(c) > 1e-9 ? [l - d, c] : l === a ? [1, 0] : [0, 1];
    const n = Math.hypot(v[0], v[1]) || 1;
    v = [v[0] / n, v[1] / n];
    return v;
  };
  return { real: true as const, values: [l1, l2] as [number, number], vectors: [vec(l1), vec(l2)] };
}

function FallbackGrid() {
  const lines = [];
  for (let i = -4; i <= 4; i++) {
    lines.push(
      <line
        key={`v${i}`}
        x1={50 + i * 8 + -3 * 4}
        y1={5}
        x2={50 + i * 8 + 3 * 4}
        y2={70}
        stroke="rgb(var(--c-line))"
        strokeWidth="0.4"
      />,
    );
    lines.push(
      <line
        key={`h${i}`}
        x1={10}
        y1={37.5 + i * 7}
        x2={90}
        y2={37.5 + i * 7}
        stroke="rgb(var(--c-line))"
        strokeWidth="0.4"
      />,
    );
  }
  return (
    <svg viewBox="0 0 100 75" className="h-full w-full">
      {lines}
      <line x1="50" y1="37.5" x2="62" y2="37.5" stroke="rgb(var(--c-signal))" strokeWidth="1" />
      <line x1="50" y1="37.5" x2="56" y2="27" stroke="rgb(var(--c-blue))" strokeWidth="1" />
    </svg>
  );
}

export function MatrixTransform({ explanation }: { explanation: ReactNode }) {
  const [m, setM] = useState<M>([1, 1, 0, 1]);
  const [preset, setPreset] = useState('shear');

  const { canvasRef, playing, setPlaying, reset } = useCanvas(
    ({ ctx, width, height, t, colors }) => {
      const vp = viewport(width, height, 4);
      // interpolate identity → M (eases in and out while playing)
      const k = playing ? (1 - Math.cos(t * 1.2)) / 2 : 1;
      const A: M = [1 + (m[0] - 1) * k, m[1] * k, m[2] * k, 1 + (m[3] - 1) * k];
      const T = (x: number, y: number): [number, number] => [
        A[0] * x + A[1] * y,
        A[2] * x + A[3] * y,
      ];
      // original grid (faint)
      ctx.strokeStyle = colors.line;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      for (let i = -8; i <= 8; i++) {
        ctx.moveTo(vp.toX(i), 0);
        ctx.lineTo(vp.toX(i), height);
        ctx.moveTo(0, vp.toY(i));
        ctx.lineTo(width, vp.toY(i));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      // transformed grid
      ctx.strokeStyle = colors.muted;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = -8; i <= 8; i++) {
        const [x1, y1] = T(i, -8);
        const [x2, y2] = T(i, 8);
        ctx.moveTo(vp.toX(x1), vp.toY(y1));
        ctx.lineTo(vp.toX(x2), vp.toY(y2));
        const [x3, y3] = T(-8, i);
        const [x4, y4] = T(8, i);
        ctx.moveTo(vp.toX(x3), vp.toY(y3));
        ctx.lineTo(vp.toX(x4), vp.toY(y4));
      }
      ctx.stroke();
      // unit square → parallelogram (area = |det|)
      const sq = [T(0, 0), T(1, 0), T(1, 1), T(0, 1)];
      ctx.fillStyle = colors.accent;
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      sq.forEach(([x, y], i) =>
        i ? ctx.lineTo(vp.toX(x), vp.toY(y)) : ctx.moveTo(vp.toX(x), vp.toY(y)),
      );
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      // basis vectors
      const arrow = (x: number, y: number, color: string, label: string) => {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(vp.toX(0), vp.toY(0));
        ctx.lineTo(vp.toX(x), vp.toY(y));
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(vp.toX(x), vp.toY(y), 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '13px ui-monospace, monospace';
        ctx.fillText(label, vp.toX(x) + 6, vp.toY(y) - 6);
      };
      const [ix, iy] = T(1, 0);
      const [jx, jy] = T(0, 1);
      arrow(ix, iy, colors.accent, 'î');
      arrow(jx, jy, colors.blue, 'ĵ');
      // eigenvectors of the target matrix
      const e = eigen(m);
      if (e.real && !playing) {
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = colors.fg;
        ctx.lineWidth = 1;
        e.vectors.forEach(([vx, vy]) => {
          ctx.beginPath();
          ctx.moveTo(vp.toX(-vx * 10), vp.toY(-vy * 10));
          ctx.lineTo(vp.toX(vx * 10), vp.toY(vy * 10));
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }
    },
    { animate: false },
  );

  const det = m[0] * m[3] - m[1] * m[2];
  const e = eigen(m);
  const set = (i: number, v: number) => {
    const next = [...m] as M;
    next[i] = v;
    setM(next);
    setPreset('');
  };

  return (
    <Shell
      id="matrices"
      index="05"
      title="Matrix transformations"
      explanation={explanation}
      canvasRef={canvasRef}
      canvasLabel={`Grid transformed by matrix [[${m[0].toFixed(2)}, ${m[1].toFixed(2)}], [${m[2].toFixed(2)}, ${m[3].toFixed(2)}]], determinant ${det.toFixed(2)}`}
      fallback={<FallbackGrid />}
      playing={playing}
      onTogglePlay={() => setPlaying(!playing)}
      onReset={() => {
        setM([1, 1, 0, 1]);
        setPreset('shear');
        reset();
      }}
      readout={
        <>
          det = {det.toFixed(2)} · λ ={' '}
          {e.real
            ? `${e.values[0].toFixed(2)}, ${e.values[1].toFixed(2)}`
            : `${e.values[0].toFixed(2)} ± ${e.values[1].toFixed(2)}i`}
        </>
      }
      controls={
        <>
          <Choice
            label="Preset"
            value={preset}
            onChange={(k) => {
              setPreset(k);
              setM([...PRESETS[k]!.m] as M);
            }}
            options={Object.entries(PRESETS).map(([k, v]) => ({ value: k, label: v.label }))}
          />
          <Slider
            id="mx-a"
            label="a (top-left)"
            value={m[0]}
            min={-2}
            max={2}
            step={0.05}
            onChange={(v) => set(0, v)}
            format={(v) => v.toFixed(2)}
          />
          <Slider
            id="mx-b"
            label="b (top-right)"
            value={m[1]}
            min={-2}
            max={2}
            step={0.05}
            onChange={(v) => set(1, v)}
            format={(v) => v.toFixed(2)}
          />
          <Slider
            id="mx-c"
            label="c (bottom-left)"
            value={m[2]}
            min={-2}
            max={2}
            step={0.05}
            onChange={(v) => set(2, v)}
            format={(v) => v.toFixed(2)}
          />
          <Slider
            id="mx-d"
            label="d (bottom-right)"
            value={m[3]}
            min={-2}
            max={2}
            step={0.05}
            onChange={(v) => set(3, v)}
            format={(v) => v.toFixed(2)}
          />
        </>
      }
    />
  );
}
