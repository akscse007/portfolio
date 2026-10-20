'use client';

import { useEffect, useState } from 'react';

const fmt = (tz: string) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: tz,
  });

/**
 * Live local time for the owner's timezone (IST, UTC+05:30 by default).
 * Rendered only after mount to avoid hydration mismatches; shows a neutral placeholder before.
 */
export function KolkataClock({
  timezone = 'Asia/Kolkata',
  label = 'IST',
}: {
  timezone?: string;
  label?: string;
}) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    let formatter: Intl.DateTimeFormat;
    try {
      formatter = fmt(timezone);
    } catch {
      formatter = fmt('Asia/Kolkata');
    }
    const tick = () => setTime(formatter.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [timezone]);

  return (
    <span className="tabular-nums" aria-live="off">
      <span className="sr-only">Local time in Kolkata: </span>
      <time suppressHydrationWarning>{time ?? '--:--:--'}</time>{' '}
      <span className="text-muted">{label}</span>
    </span>
  );
}
