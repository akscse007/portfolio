import { cn } from '@/lib/utils';

/**
 * "AR" ligature monogram: the A's crossbar is a sine wave (patterns),
 * its right leg lands on the R's stem (systems), and the apex carries a signal dot.
 */
export function LogoMark({
  className,
  title = 'Akash Roy',
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn('h-8 w-8 shrink-0', className)}
      role="img"
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <path d="M5 43 L17.5 6 L30 43" />
      <path
        d="M9.5 29.5 C12.5 24.5 15 34.5 18 29.5 S23.5 24.5 26 29.5"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M30 43 V6 H37 A8 8 0 0 1 37 22 H30" />
      <path d="M36.5 22 L44 43" />
      <circle cx="17.5" cy="6" r="3.2" fill="rgb(var(--c-signal))" stroke="none" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span
          className="font-display text-[0.95rem] font-bold tracking-[0.02em]"
          style={{ fontStretch: '85%' }}
        >
          AKASH ROY
        </span>
        <span className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted">
          Digital Lab
        </span>
      </span>
    </span>
  );
}
