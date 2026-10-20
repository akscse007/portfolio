'use client';

import { useState, type ReactNode } from 'react';
import { useCanvas } from './useCanvas';
import { Choice, FallbackPlot, Shell, Slider } from './Shell';

type Wave = 'square' | 'sawtooth' | 'triangle';

/** Fourier coefficients (amplitude, frequency) for the k-th non-zero term. */
function term(wave: Wave, k: number): { amp: number; freq: number; phase: number } {
  if (wave === 'square') {
    const n = 2 * k + 1;
    return { amp: 4 / (Math.PI * n), freq: n, phase: 0 };
  }
  if (wave === 'sawtooth') {
    const n = k + 1;
    return { amp: (2 / (Math.PI * n)) * (n % 2 ? 1 : -1), freq: n, phase: 0 };
  }
  const n = 2 * k + 1;
  return { amp: (8 / (Math.PI * Math.PI * n * n)) * (k % 2 ? -1 : 1), freq: n, phase: Math.PI / 2 };
}

const FALLBACK = Array.from({ length: 201 }, (_, i) => {
  const x = -1 + i / 100;
  let y = 0;
  for (let k = 0; k < 6; k++)
    y += (4 / (Math.PI * (2 * k + 1))) * Math.sin((2 * k + 1) * Math.PI * 2 * x);
  return [x, y * 0.7] as [number, number];
});

export function Fourier({ explanation }: { explanation: ReactNode }) {
  const [wave, setWave] = useState<Wave>('square');
  const [terms, setTerms] = useState(5);

  const { canvasRef, playing, setPlaying, reset } = useCanvas(
    ({ ctx, width, height, t, colors }) => {
      const narrow = width < 560;
      const R = Math.min(height * 0.22, width * (narrow ? 0.16 : 0.12));
      const cx = narrow ? width * 0.25 : width * 0.22;
      const cy = height / 2;
      const theta = t * 0.9;
      // epicycles
      let x = cx;
      let y = cy;
      for (let k = 0; k < terms; k++) {
        const { amp, freq, phase } = term(wave, k);
        const r = amp * R;
        ctx.strokeStyle = colors.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, Math.abs(r), 0, Math.PI * 2);
        ctx.stroke();
        const nx = x + r * Math.cos(freq * theta + phase);
        const ny = y - r * Math.sin(freq * theta + phase);
        ctx.strokeStyle = colors.muted;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        x = nx;
        y = ny;
      }
      const waveX = narrow ? width * 0.5 : width * 0.42;
      ctx.strokeStyle = colors.blue;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(waveX, y);
      ctx.stroke();
      ctx.setLineDash([]);
      // partial-sum waveform scrolling to the right
      const span = width - waveX - 12;
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let px = 0; px <= span; px++) {
        const th = theta - (px / span) * Math.PI * 4;
        let s = 0;
        for (let k = 0; k < terms; k++) {
          const { amp, freq, phase } = term(wave, k);
          s += amp * Math.sin(freq * th + phase);
        }
        const py = cy - s * R;
        if (px) ctx.lineTo(waveX + px, py);
        else ctx.moveTo(waveX + px, py);
      }
      ctx.stroke();
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(waveX, y, 4, 0, Math.PI * 2);
      ctx.fill();
    },
  );

  return (
    <Shell
      id="fourier"
      index="07"
      title="Fourier series"
      explanation={explanation}
      canvasRef={canvasRef}
      canvasLabel={`${wave} wave approximated by ${terms} Fourier terms, drawn with rotating epicycles`}
      fallback={<FallbackPlot points={FALLBACK} caption="Square wave, 6 terms (static preview)" />}
      ratio="16 / 9"
      playing={playing}
      onTogglePlay={() => setPlaying(!playing)}
      onReset={() => {
        setWave('square');
        setTerms(5);
        reset();
      }}
      readout={`N = ${terms} term${terms === 1 ? '' : 's'}`}
      controls={
        <>
          <Choice
            label="Target wave"
            value={wave}
            onChange={setWave}
            options={[
              { value: 'square', label: 'Square' },
              { value: 'sawtooth', label: 'Sawtooth' },
              { value: 'triangle', label: 'Triangle' },
            ]}
          />
          <Slider
            id="fo-n"
            label="Number of terms N"
            value={terms}
            min={1}
            max={40}
            onChange={setTerms}
          />
        </>
      }
    />
  );
}
