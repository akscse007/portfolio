'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useCanvas } from './useCanvas';
import { Choice, Shell, Slider, viewport } from './Shell';

type SurfaceName = 'bowl' | 'valley' | 'rosenbrock' | 'himmelblau';
const SURFACES: Record<
  SurfaceName,
  {
    label: string;
    f: (x: number, y: number) => number;
    g: (x: number, y: number) => [number, number];
    range: number;
    start: [number, number];
  }
> = {
  bowl: {
    label: 'Round bowl',
    f: (x, y) => x * x + y * y,
    g: (x, y) => [2 * x, 2 * y],
    range: 3,
    start: [-2.4, 1.8],
  },
  valley: {
    label: 'Narrow valley',
    f: (x, y) => 0.5 * x * x + 6 * y * y,
    g: (x, y) => [x, 12 * y],
    range: 3,
    start: [-2.6, 1.2],
  },
  rosenbrock: {
    label: 'Rosenbrock',
    f: (x, y) => (1 - x) ** 2 + 10 * (y - x * x) ** 2,
    g: (x, y) => [-2 * (1 - x) - 40 * x * (y - x * x), 20 * (y - x * x)],
    range: 2.2,
    start: [-1.6, 1.8],
  },
  himmelblau: {
    label: 'Himmelblau',
    f: (x, y) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2,
    g: (x, y) => [
      4 * x * (x * x + y - 11) + 2 * (x + y * y - 7),
      2 * (x * x + y - 11) + 4 * y * (x + y * y - 7),
    ],
    range: 5,
    start: [0.2, 0.3],
  },
};

function FallbackContours() {
  return (
    <svg viewBox="0 0 100 75" className="h-full w-full">
      {[6, 12, 18, 24, 30].map((r) => (
        <ellipse
          key={r}
          cx="50"
          cy="37.5"
          rx={r * 1.4}
          ry={r * 0.6}
          fill="none"
          stroke="rgb(var(--c-line))"
          strokeWidth="0.4"
        />
      ))}
      <polyline
        points="14,20 30,46 38,30 44,41 47,35 49,38 50,37.5"
        fill="none"
        stroke="rgb(var(--c-signal))"
        strokeWidth="0.7"
      />
    </svg>
  );
}

export function GradientDescent({ explanation }: { explanation: ReactNode }) {
  const [surface, setSurface] = useState<SurfaceName>('valley');
  const [lr, setLr] = useState(0.08);
  const [momentum, setMomentum] = useState(0);
  const sim = useRef({
    pos: SURFACES.valley.start as [number, number],
    vel: [0, 0] as [number, number],
    path: [SURFACES.valley.start] as [number, number][],
    acc: 0,
    steps: 0,
    diverged: false,
  });
  const heat = useRef<{ key: string; canvas: HTMLCanvasElement | null }>({ key: '', canvas: null });
  const [, force] = useState(0);

  const restart = (s: SurfaceName = surface, start?: [number, number]) => {
    const p = start ?? SURFACES[s].start;
    sim.current = {
      pos: [...p] as [number, number],
      vel: [0, 0],
      path: [[...p] as [number, number]],
      acc: 0,
      steps: 0,
      diverged: false,
    };
    force((n) => n + 1);
  };

  const step = () => {
    const S = SURFACES[surface];
    const st = sim.current;
    if (st.diverged || st.steps > 600) return;
    const [gx, gy] = S.g(st.pos[0], st.pos[1]);
    st.vel = [momentum * st.vel[0] + gx, momentum * st.vel[1] + gy];
    st.pos = [st.pos[0] - lr * st.vel[0], st.pos[1] - lr * st.vel[1]];
    st.steps++;
    if (!Number.isFinite(st.pos[0]) || Math.abs(st.pos[0]) > 1e3 || Math.abs(st.pos[1]) > 1e3)
      st.diverged = true;
    st.path.push([...st.pos] as [number, number]);
  };

  const { canvasRef, playing, setPlaying, reset } = useCanvas(
    ({ ctx, width, height, dt, colors }) => {
      const S = SURFACES[surface];
      const vp = viewport(width, height, S.range * (width / height > 1.2 ? 1.3 : 1), S.range);
      // cached heatmap (log-scaled loss)
      const key = `${surface}-${Math.round(width)}x${Math.round(height)}-${colors.accent}`;
      if (heat.current.key !== key) {
        const w = Math.max(1, Math.round(width / 3));
        const h = Math.max(1, Math.round(height / 3));
        const img = ctx.createImageData(w, h);
        let max = 0;
        const vals = new Float32Array(w * h);
        for (let j = 0; j < h; j++)
          for (let i = 0; i < w; i++) {
            const v = Math.log1p(S.f(vp.fromX((i + 0.5) * 3), vp.fromY((j + 0.5) * 3)));
            vals[j * w + i] = v;
            if (v > max) max = v;
          }
        for (let k = 0; k < vals.length; k++) {
          const n = vals[k]! / (max || 1);
          const band = Math.abs(((n * 14) % 1) - 0.5) < 0.06 ? 1 : 0; // contour bands
          const shade = 255 * (0.08 + 0.25 * (1 - n));
          img.data[k * 4] = band ? 198 : shade * 0.6;
          img.data[k * 4 + 1] = band ? 244 : shade * 0.62;
          img.data[k * 4 + 2] = band ? 50 : shade * 0.55;
          img.data[k * 4 + 3] = band ? 120 : 255;
        }
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        off.getContext('2d')!.putImageData(img, 0, 0);
        heat.current = { key, canvas: off };
      }
      if (heat.current.canvas) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(heat.current.canvas, 0, 0, width, height);
      }
      // advance
      if (dt > 0) {
        const st = sim.current;
        st.acc += dt;
        while (st.acc > 0.06) {
          step();
          st.acc -= 0.06;
        }
      }
      const st = sim.current;
      ctx.strokeStyle = colors.fg;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      st.path.forEach(([x, y], i) =>
        i ? ctx.lineTo(vp.toX(x), vp.toY(y)) : ctx.moveTo(vp.toX(x), vp.toY(y)),
      );
      ctx.stroke();
      ctx.fillStyle = colors.fg;
      st.path.forEach(([x, y]) => ctx.fillRect(vp.toX(x) - 1.5, vp.toY(y) - 1.5, 3, 3));
      const [x, y] = st.pos;
      ctx.fillStyle = st.diverged ? colors.danger : colors.accent;
      ctx.beginPath();
      ctx.arc(vp.toX(x), vp.toY(y), 6, 0, Math.PI * 2);
      ctx.fill();
    },
  );

  // Refresh the numeric readout while animating.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => force((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [playing]);

  const st = sim.current;
  const loss = SURFACES[surface].f(st.pos[0], st.pos[1]);

  return (
    <Shell
      id="gradient-descent"
      index="04"
      title="Gradient descent"
      explanation={explanation}
      canvasRef={canvasRef}
      canvasLabel={`Gradient descent on the ${SURFACES[surface].label} surface. Click or tap to choose a start point; arrow keys move it.`}
      fallback={<FallbackContours />}
      playing={playing}
      onTogglePlay={() => {
        if (!playing && (st.diverged || st.steps > 600)) restart();
        setPlaying(!playing);
      }}
      onReset={() => {
        setLr(0.08);
        setMomentum(0);
        setSurface('valley');
        heat.current.key = '';
        restart('valley');
        reset();
      }}
      readout={
        st.diverged
          ? 'Diverged — lower the learning rate'
          : `step ${st.steps} · loss ${Number.isFinite(loss) ? loss.toFixed(4) : '∞'}`
      }
      onCanvasPointer={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const S = SURFACES[surface];
        const vp = viewport(
          r.width,
          r.height,
          S.range * (r.width / r.height > 1.2 ? 1.3 : 1),
          S.range,
        );
        restart(surface, [vp.fromX(e.clientX - r.left), vp.fromY(e.clientY - r.top)]);
      }}
      onCanvasKey={(e) => {
        const d: Record<string, [number, number]> = {
          ArrowUp: [0, 0.2],
          ArrowDown: [0, -0.2],
          ArrowLeft: [-0.2, 0],
          ArrowRight: [0.2, 0],
        };
        const m = d[e.key];
        if (m) {
          e.preventDefault();
          restart(surface, [st.path[0]![0] + m[0], st.path[0]![1] + m[1]]);
        } else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setPlaying(!playing);
        }
      }}
      controls={
        <>
          <Choice
            label="Loss surface"
            value={surface}
            onChange={(v) => {
              setSurface(v);
              restart(v);
            }}
            options={(Object.keys(SURFACES) as SurfaceName[]).map((k) => ({
              value: k,
              label: SURFACES[k].label,
            }))}
          />
          <Slider
            id="gd-lr"
            label="Learning rate η"
            value={lr}
            min={0.002}
            max={0.2}
            step={0.002}
            onChange={(v) => {
              setLr(v);
              restart();
            }}
            format={(v) => v.toFixed(3)}
          />
          <Slider
            id="gd-mom"
            label="Momentum β"
            value={momentum}
            min={0}
            max={0.95}
            step={0.05}
            onChange={(v) => {
              setMomentum(v);
              restart();
            }}
            format={(v) => v.toFixed(2)}
          />
          <button
            type="button"
            className="btn-ghost btn-sm sm:col-span-2 sm:justify-self-start"
            onClick={() => {
              step();
              force((n) => n + 1);
            }}
          >
            Single step
          </button>
        </>
      }
    />
  );
}
