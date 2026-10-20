'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useCanvas } from './useCanvas';
import { Choice, Shell, Slider } from './Shell';

type Dataset = 'xor' | 'circle' | 'spiral';
type Net = { W1: number[][]; b1: number[]; W2: number[][]; b2: number[]; W3: number[]; b3: number };

const H = 8;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeData(kind: Dataset, n = 160): { x: [number, number]; y: number }[] {
  const r = rng(kind === 'xor' ? 1 : kind === 'circle' ? 2 : 3);
  const out: { x: [number, number]; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (kind === 'xor') {
      const x: [number, number] = [r() * 2 - 1, r() * 2 - 1];
      out.push({ x, y: x[0] * x[1] > 0 ? 1 : 0 });
    } else if (kind === 'circle') {
      const x: [number, number] = [r() * 2 - 1, r() * 2 - 1];
      out.push({ x, y: Math.hypot(x[0], x[1]) < 0.55 ? 1 : 0 });
    } else {
      const cls = i % 2;
      const t = (i / n) * 3 + 0.3;
      const ang = t * 2.2 + cls * Math.PI;
      const rad = t / 3.6;
      out.push({
        x: [rad * Math.cos(ang) + (r() - 0.5) * 0.08, rad * Math.sin(ang) + (r() - 0.5) * 0.08],
        y: cls,
      });
    }
  }
  return out;
}

function initNet(seed = 7): Net {
  const r = rng(seed);
  const g = (fan: number) => (r() * 2 - 1) * Math.sqrt(3 / fan);
  return {
    W1: Array.from({ length: H }, () => [g(2), g(2)]),
    b1: Array(H).fill(0),
    W2: Array.from({ length: H }, () => Array.from({ length: H }, () => g(H))),
    b2: Array(H).fill(0),
    W3: Array.from({ length: H }, () => g(H)),
    b3: 0,
  };
}

function forward(n: Net, x: [number, number]) {
  const h1 = n.W1.map((w, i) => Math.tanh(w[0]! * x[0] + w[1]! * x[1] + n.b1[i]!));
  const h2 = n.W2.map((w, i) => Math.tanh(w.reduce((s, wij, j) => s + wij * h1[j]!, n.b2[i]!)));
  const z = n.W3.reduce((s, w, j) => s + w * h2[j]!, n.b3);
  return { h1, h2, p: 1 / (1 + Math.exp(-z)) };
}

/** One epoch of mini-batch SGD with backpropagation (binary cross-entropy). */
function trainEpoch(n: Net, data: { x: [number, number]; y: number }[], lr: number) {
  let loss = 0;
  for (const { x, y } of data) {
    const { h1, h2, p } = forward(n, x);
    loss += -(y * Math.log(p + 1e-9) + (1 - y) * Math.log(1 - p + 1e-9));
    const dz = p - y; // dL/dz for sigmoid + BCE
    const dh2 = n.W3.map((w, j) => dz * w * (1 - h2[j]! ** 2));
    for (let j = 0; j < H; j++) n.W3[j]! -= lr * dz * h2[j]!;
    n.b3 -= lr * dz;
    const dh1 = h1.map(
      (_, k) => n.W2.reduce((s, row, i) => s + dh2[i]! * row[k]!, 0) * (1 - h1[k]! ** 2),
    );
    for (let i = 0; i < H; i++) {
      for (let k = 0; k < H; k++) n.W2[i]![k]! -= lr * dh2[i]! * h1[k]!;
      n.b2[i]! -= lr * dh2[i]!;
    }
    for (let k = 0; k < H; k++) {
      n.W1[k]![0]! -= lr * dh1[k]! * x[0];
      n.W1[k]![1]! -= lr * dh1[k]! * x[1];
      n.b1[k]! -= lr * dh1[k]!;
    }
  }
  return loss / data.length;
}

function FallbackNet() {
  const layers = [2, 8, 8, 1];
  const nodes = layers.map((n, li) =>
    Array.from({ length: n }, (_, i) => [15 + li * 23, 37.5 + (i - (n - 1) / 2) * 7.5] as const),
  );
  return (
    <svg viewBox="0 0 100 75" className="h-full w-full">
      {nodes
        .slice(0, -1)
        .map((layer, li) =>
          layer.flatMap(([x1, y1], i) =>
            nodes[li + 1]!.map(([x2, y2], j) => (
              <line
                key={`${li}-${i}-${j}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgb(var(--c-line))"
                strokeWidth="0.25"
              />
            )),
          ),
        )}
      {nodes.flat().map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="1.8"
          fill="rgb(var(--c-surface))"
          stroke="rgb(var(--c-signal))"
          strokeWidth="0.5"
        />
      ))}
    </svg>
  );
}

export function NeuralNet({ explanation }: { explanation: ReactNode }) {
  const [dataset, setDataset] = useState<Dataset>('circle');
  const [lr, setLr] = useState(0.05);
  const data = useRef(makeData('circle'));
  const net = useRef<Net>(initNet());
  const stats = useRef({ epoch: 0, loss: 0, acc: 0 });
  const [, force] = useState(0);

  const restart = (d: Dataset = dataset) => {
    data.current = makeData(d);
    net.current = initNet();
    stats.current = { epoch: 0, loss: 0, acc: 0 };
    force((n) => n + 1);
  };

  const { canvasRef, playing, setPlaying, reset } = useCanvas(
    ({ ctx, width, height, dt, colors }) => {
      if (dt > 0 && stats.current.epoch < 3000) {
        for (let k = 0; k < 2; k++) {
          stats.current.loss = trainEpoch(net.current, data.current, lr);
          stats.current.epoch++;
        }
        stats.current.acc =
          data.current.filter((d) => (forward(net.current, d.x).p > 0.5 ? 1 : 0) === d.y).length /
          data.current.length;
      }
      const plotW = width >= 560 ? width * 0.62 : width;
      const plotH = width >= 560 ? height : height * 0.62;
      // decision boundary heatmap
      const cell = width < 500 ? 10 : 8;
      for (let px = 0; px < plotW; px += cell)
        for (let py = 0; py < plotH; py += cell) {
          const x: [number, number] = [(px / plotW) * 2 - 1, 1 - (py / plotH) * 2];
          const p = forward(net.current, x).p;
          ctx.fillStyle = p > 0.5 ? colors.accent : colors.blue;
          ctx.globalAlpha = 0.08 + Math.abs(p - 0.5) * 0.5;
          ctx.fillRect(px, py, cell, cell);
        }
      ctx.globalAlpha = 1;
      for (const d of data.current) {
        ctx.beginPath();
        ctx.arc(((d.x[0] + 1) / 2) * plotW, ((1 - d.x[1]) / 2) * plotH, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = d.y ? colors.accent : colors.blue;
        ctx.fill();
        ctx.strokeStyle = colors.bg;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // network diagram
      const ox = width >= 560 ? plotW : 0;
      const oy = width >= 560 ? 0 : plotH;
      const w = width - ox;
      const h = height - oy;
      const layers = [2, H, H, 1];
      const pos = layers.map((n, li) =>
        Array.from(
          { length: n },
          (_, i) =>
            [
              ox + w * (0.15 + li * 0.233),
              oy + h / 2 + (i - (n - 1) / 2) * Math.min(26, (h * 0.85) / n),
            ] as const,
        ),
      );
      const weights = [net.current.W1, net.current.W2, net.current.W3.map((v) => [v])];
      weights.forEach((W, li) => {
        W.forEach((row, j) =>
          row.forEach((wv, i) => {
            const a = li === 2 ? pos[2]![j]! : pos[li]![i]!;
            const b = li === 2 ? pos[3]![0]! : pos[li + 1]![j]!;
            ctx.strokeStyle = wv > 0 ? colors.accent : colors.blue;
            ctx.globalAlpha = Math.min(0.9, Math.abs(wv) * 0.35 + 0.05);
            ctx.lineWidth = Math.min(3, Math.abs(wv) * 1.2 + 0.3);
            ctx.beginPath();
            ctx.moveTo(a[0], a[1]);
            ctx.lineTo(b[0], b[1]);
            ctx.stroke();
          }),
        );
      });
      ctx.globalAlpha = 1;
      pos.flat().forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = colors.bg;
        ctx.fill();
        ctx.strokeStyle = colors.fg;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    },
  );

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => force((n) => n + 1), 300);
    return () => window.clearInterval(id);
  }, [playing]);

  const s = stats.current;
  return (
    <Shell
      id="neural-network"
      index="06"
      title="A tiny neural network"
      explanation={explanation}
      canvasRef={canvasRef}
      canvasLabel={`Neural network with two hidden layers of ${H} neurons learning the ${dataset} dataset. Epoch ${s.epoch}, accuracy ${(s.acc * 100).toFixed(0)} percent.`}
      fallback={<FallbackNet />}
      playing={playing}
      onTogglePlay={() => setPlaying(!playing)}
      onReset={() => {
        setLr(0.05);
        setDataset('circle');
        restart('circle');
        reset();
      }}
      readout={`epoch ${s.epoch} · loss ${s.loss.toFixed(3)} · acc ${(s.acc * 100).toFixed(0)}%`}
      controls={
        <>
          <Choice
            label="Dataset"
            value={dataset}
            onChange={(d) => {
              setDataset(d);
              restart(d);
            }}
            options={[
              { value: 'circle', label: 'Circle' },
              { value: 'xor', label: 'XOR' },
              { value: 'spiral', label: 'Spiral' },
            ]}
          />
          <Slider
            id="nn-lr"
            label="Learning rate"
            value={lr}
            min={0.005}
            max={0.3}
            step={0.005}
            onChange={setLr}
            format={(v) => v.toFixed(3)}
          />
        </>
      }
    />
  );
}
