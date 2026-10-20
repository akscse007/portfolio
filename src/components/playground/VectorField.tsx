'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useCanvas } from './useCanvas';
import { Choice, Shell, Slider, viewport } from './Shell';

type FieldName = 'rotation' | 'saddle' | 'sink' | 'spiral' | 'pendulum' | 'dipole';

const FIELDS: Record<
  FieldName,
  { label: string; f: (x: number, y: number) => [number, number]; tex: string }
> = {
  rotation: { label: 'Rotation', f: (x, y) => [-y, x], tex: '(-y, x)' },
  saddle: { label: 'Saddle', f: (x, y) => [x, -y], tex: '(x, -y)' },
  sink: { label: 'Sink', f: (x, y) => [-x, -y], tex: '(-x, -y)' },
  spiral: {
    label: 'Spiral',
    f: (x, y) => [-0.3 * x - y, x - 0.3 * y],
    tex: '(-0.3x - y, x - 0.3y)',
  },
  pendulum: {
    label: 'Pendulum',
    f: (x, y) => [y, -Math.sin(x) - 0.15 * y],
    tex: '(y, -\\sin x - 0.15y)',
  },
  dipole: {
    label: 'Dipole',
    f: (x, y) => {
      const r1 = Math.max(0.2, (x - 1) ** 2 + y ** 2) ** 1.5;
      const r2 = Math.max(0.2, (x + 1) ** 2 + y ** 2) ** 1.5;
      return [(x - 1) / r1 - (x + 1) / r2, y / r1 - y / r2];
    },
    tex: '\\text{two opposite charges}',
  },
};

function FallbackArrows() {
  const arrows = [];
  for (let i = -4; i <= 4; i++)
    for (let j = -3; j <= 3; j++) {
      const x = 50 + i * 10;
      const y = 37.5 + j * 10;
      const [u, v] = [-j, i];
      const n = Math.hypot(u, v) || 1;
      arrows.push(
        <line
          key={`${i}${j}`}
          x1={x}
          y1={y}
          x2={x + (u / n) * 4}
          y2={y - (v / n) * 4}
          stroke="rgb(var(--c-signal))"
          strokeWidth="0.5"
        />,
      );
    }
  return (
    <svg viewBox="0 0 100 75" className="h-full w-full">
      {arrows}
    </svg>
  );
}

export function VectorField({ explanation }: { explanation: ReactNode }) {
  const [field, setField] = useState<FieldName>('spiral');
  const [density, setDensity] = useState(600);
  const [speed, setSpeed] = useState(1);
  const particles = useRef<{ x: number; y: number; age: number }[]>([]);

  const { canvasRef, playing, setPlaying, reset } = useCanvas(
    ({ ctx, width, height, dt, colors }) => {
      const vp = viewport(width, height, 4);
      const f = FIELDS[field].f;
      // arrow grid
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      const stepPx = width < 500 ? 34 : 42;
      for (let px = stepPx / 2; px < width; px += stepPx)
        for (let py = stepPx / 2; py < height; py += stepPx) {
          const [u, v] = f(vp.fromX(px), vp.fromY(py));
          const n = Math.hypot(u, v) || 1;
          const len = 12;
          const ex = px + (u / n) * len;
          const ey = py - (v / n) * len;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = colors.muted;
          ctx.fill();
        }
      // particles
      const ps = particles.current;
      const target = width < 500 ? Math.min(density, 300) : density;
      while (ps.length < target)
        ps.push({
          x: (Math.random() * 2 - 1) * vp.xRange,
          y: (Math.random() * 2 - 1) * vp.yRange,
          age: Math.random() * 200,
        });
      ps.length = target;
      ctx.fillStyle = colors.accent;
      for (const p of ps) {
        const [u, v] = f(p.x, p.y);
        const n = Math.hypot(u, v);
        const s = (speed * (dt || 0.016)) / Math.max(1, n * 0.4);
        p.x += u * s;
        p.y += v * s;
        p.age += 1;
        if (p.age > 240 || Math.abs(p.x) > vp.xRange || Math.abs(p.y) > vp.yRange || n < 1e-3) {
          p.x = (Math.random() * 2 - 1) * vp.xRange;
          p.y = (Math.random() * 2 - 1) * vp.yRange;
          p.age = 0;
        }
        ctx.fillRect(vp.toX(p.x) - 1, vp.toY(p.y) - 1, 2, 2);
      }
    },
  );

  return (
    <Shell
      id="vector-fields"
      index="03"
      title="Vector fields"
      explanation={explanation}
      canvasRef={canvasRef}
      canvasLabel={`${FIELDS[field].label} vector field with moving particles`}
      fallback={<FallbackArrows />}
      playing={playing}
      onTogglePlay={() => setPlaying(!playing)}
      onReset={() => {
        setField('spiral');
        setDensity(600);
        setSpeed(1);
        particles.current = [];
        reset();
      }}
      readout={`F(x, y) = ${FIELDS[field].tex.replace(/\\[a-z]+\{?|\}/g, '')}`}
      controls={
        <>
          <Choice
            label="Field"
            value={field}
            onChange={(v) => {
              setField(v);
              particles.current = [];
            }}
            options={(Object.keys(FIELDS) as FieldName[]).map((k) => ({
              value: k,
              label: FIELDS[k].label,
            }))}
          />
          <Slider
            id="vf-density"
            label="Particles"
            value={density}
            min={100}
            max={1500}
            step={50}
            onChange={setDensity}
          />
          <Slider
            id="vf-speed"
            label="Speed"
            value={speed}
            min={0.2}
            max={3}
            step={0.1}
            onChange={setSpeed}
            format={(v) => `${v.toFixed(1)}×`}
          />
        </>
      }
    />
  );
}
