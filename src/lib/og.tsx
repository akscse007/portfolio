import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

/** Social preview card in the Digital Lab identity (graphite, warm white, acid lime). */
export function ogImage({
  kicker,
  title,
  footer,
}: {
  kicker: string;
  title: string;
  footer?: string;
}) {
  const lissajous = Array.from({ length: 241 }, (_, i) => {
    const u = (i / 240) * Math.PI * 2;
    return `${(930 + 190 * Math.sin(3 * u + 0.8)).toFixed(1)},${(315 + 190 * Math.sin(4 * u)).toFixed(1)}`;
  }).join(' ');
  const size = title.length > 60 ? 58 : title.length > 36 ? 70 : 88;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0e0f0c',
          color: '#edeae2',
          padding: '64px 72px',
          position: 'relative',
        }}
      >
        <svg
          width="1200"
          height="630"
          style={{ position: 'absolute', top: 0, left: 0 }}
          viewBox="0 0 1200 630"
        >
          <polyline
            points={lissajous}
            fill="none"
            stroke="#c6f432"
            strokeOpacity="0.55"
            strokeWidth="2"
          />
          <line x1="0" y1="560" x2="1200" y2="560" stroke="#34362e" strokeWidth="2" />
        </svg>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 22,
            letterSpacing: 4,
            color: '#9e9b91',
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: 7, background: '#c6f432' }} />
          {kicker.toUpperCase()}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: size,
            fontWeight: 800,
            lineHeight: 1.02,
            maxWidth: 820,
            letterSpacing: -2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 22,
            color: '#9e9b91',
            letterSpacing: 2,
          }}
        >
          <span>AKASH ROY — DIGITAL LAB</span>
          <span style={{ color: '#7fb2ff' }}>{footer ?? 'I BUILD SYSTEMS. I STUDY PATTERNS.'}</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
