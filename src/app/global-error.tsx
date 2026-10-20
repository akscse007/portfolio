'use client';

/** Last-resort boundary when the root layout itself fails. Keeps styling inline. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#0e0f0c',
          color: '#edeae2',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ maxWidth: 520 }}>
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                letterSpacing: '0.1em',
                color: '#9e9b91',
              }}
            >
              DIGITAL LAB — ERROR
            </p>
            <h1 style={{ fontSize: 40, margin: '12px 0' }}>The lab is temporarily unavailable.</h1>
            <p style={{ color: '#c8c5bc' }}>Please try again in a moment.</p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 20,
                background: '#c6f432',
                color: '#0e0f0c',
                border: 0,
                padding: '12px 20px',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              RETRY
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
