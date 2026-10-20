'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { compile, ParseError } from '@/lib/math/expression';
import { useCanvas } from './useCanvas';
import { drawAxes, FallbackPlot, Shell, Slider, viewport } from './Shell';

const PRESETS = [
  'sin(x)',
  'x^2 - 2',
  'sin(3x) / x',
  'exp(-x^2)',
  'sigmoid(2x)',
  'abs(x) - 1',
  'ln(x)',
  'tanh(x)',
];
const FALLBACK = Array.from({ length: 201 }, (_, i) => {
  const x = -1 + i / 100;
  return [x, Math.sin(x * 6) * 0.8] as [number, number];
});

export function FunctionPlot({ explanation }: { explanation: ReactNode }) {
  const [input, setInput] = useState('sin(3x) / x');
  const [expr, setExpr] = useState('sin(3x) / x');
  const [range, setRange] = useState(8);
  const [showDerivative, setShowDerivative] = useState(true);

  const compiled = useMemo(() => {
    try {
      return { fn: compile(expr), error: null as string | null };
    } catch (e) {
      return {
        fn: null,
        error: e instanceof ParseError ? e.message : 'Could not parse expression',
      };
    }
  }, [expr]);

  const { canvasRef, playing, setPlaying, reset } = useCanvas(
    ({ ctx, width, height, t, colors }) => {
      const vp = viewport(width, height, range);
      drawAxes(ctx, width, height, vp, colors, range > 10 ? 5 : 1);
      const f = compiled.fn;
      if (!f) return;
      const plot = (g: (x: number) => number, color: string, widthPx: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = widthPx;
        ctx.beginPath();
        let pen = false;
        for (let px = 0; px <= width; px++) {
          const x = vp.fromX(px);
          const y = g(x);
          if (!Number.isFinite(y) || Math.abs(y) > vp.yRange * 20) {
            pen = false;
            continue;
          }
          const py = vp.toY(y);
          if (pen) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
          pen = true;
        }
        ctx.stroke();
      };
      if (showDerivative) {
        const h = 1e-4;
        plot((x) => (f(x + h) - f(x - h)) / (2 * h), colors.blue, 1);
      }
      plot(f, colors.accent, 2);
      // animated trace point with tangent
      const x0 = Math.sin(t * 0.5) * range * 0.8;
      const y0 = f(x0);
      if (Number.isFinite(y0)) {
        const slope = (f(x0 + 1e-4) - f(x0 - 1e-4)) / 2e-4;
        ctx.strokeStyle = colors.fg;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(vp.toX(x0 - 1.5), vp.toY(y0 - 1.5 * slope));
        ctx.lineTo(vp.toX(x0 + 1.5), vp.toY(y0 + 1.5 * slope));
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.fg;
        ctx.beginPath();
        ctx.arc(vp.toX(x0), vp.toY(y0), 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(
          `x=${x0.toFixed(2)}  f=${y0.toFixed(3)}  f′=${Number.isFinite(slope) ? slope.toFixed(3) : '—'}`,
          10,
          18,
        );
      }
    },
  );

  return (
    <Shell
      id="functions"
      index="02"
      title="Function plotter"
      explanation={explanation}
      canvasRef={canvasRef}
      canvasLabel={`Plot of f(x) = ${expr}${showDerivative ? ' with its derivative' : ''}`}
      fallback={<FallbackPlot points={FALLBACK} caption="f(x) = sin(3x)/x (static preview)" />}
      playing={playing}
      onTogglePlay={() => setPlaying(!playing)}
      onReset={() => {
        setInput('sin(3x) / x');
        setExpr('sin(3x) / x');
        setRange(8);
        setShowDerivative(true);
        reset();
      }}
      controls={
        <>
          <form
            className="sm:col-span-2"
            onSubmit={(e) => {
              e.preventDefault();
              setExpr(input);
            }}
          >
            <label htmlFor="fn-expr" className="label mb-1.5 block">
              f(x) =
            </label>
            <div className="flex gap-2">
              <input
                id="fn-expr"
                className="input font-mono"
                value={input}
                maxLength={160}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => setInput(e.target.value)}
                aria-describedby="fn-help fn-error"
                aria-invalid={Boolean(compiled.error)}
              />
              <button type="submit" className="btn-primary shrink-0">
                Plot
              </button>
            </div>
            <p id="fn-help" className="mt-2 text-xs text-muted">
              Use x, numbers, + − × ÷ ^, pi, e and functions like sin, cos, exp, ln, sqrt, abs,
              sigmoid. Expressions are parsed by a restricted parser — never evaluated as code.
            </p>
            {compiled.error && (
              <p id="fn-error" role="alert" className="mt-2 text-sm text-danger">
                {compiled.error}
              </p>
            )}
          </form>
          <div
            className="flex flex-wrap gap-2 sm:col-span-2"
            role="group"
            aria-label="Preset functions"
          >
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className="chip normal-case"
                aria-pressed={expr === p}
                onClick={() => {
                  setInput(p);
                  setExpr(p);
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <Slider
            id="fn-range"
            label="x range ±"
            value={range}
            min={2}
            max={30}
            onChange={setRange}
          />
          <label className="flex min-h-11 items-center gap-3 self-end">
            <input
              type="checkbox"
              checked={showDerivative}
              onChange={(e) => setShowDerivative(e.target.checked)}
              className="h-5 w-5 accent-[rgb(var(--c-signal))]"
            />
            <span className="label">Show derivative f′(x)</span>
          </label>
        </>
      }
    />
  );
}
