import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0e0f0c',
        }}
      >
        <svg width="132" height="132" viewBox="0 0 48 48">
          <g fill="none" stroke="#edeae2" strokeWidth="2.8">
            <path d="M7 41 L18 9 L29 41" />
            <path d="M11 29.5 C13.5 25 16 34 18.5 29.5 S23.5 25 26 29.5" strokeWidth="2.2" />
            <path d="M29 41 V9 H35 A7 7 0 0 1 35 23 H29" />
            <path d="M34.5 23 L41 41" />
          </g>
          <circle cx="18" cy="9" r="3.4" fill="#c6f432" />
        </svg>
      </div>
    ),
    size,
  );
}
