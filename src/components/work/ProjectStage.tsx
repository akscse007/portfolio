import { Pill } from '@/components/ui/primitives';

const LABELS: Record<string, { label: string; tone: 'accent' | 'blue' | 'default' | 'warn' }> = {
  LIVE: { label: 'Live', tone: 'accent' },
  IN_PROGRESS: { label: 'Work in progress', tone: 'blue' },
  RESEARCH: { label: 'Research', tone: 'blue' },
  PROTOTYPE: { label: 'Prototype / demo', tone: 'default' },
  ARCHIVED: { label: 'Archived', tone: 'default' },
};

export function ProjectStage({ stage, note }: { stage: string; note?: string | null }) {
  const s = LABELS[stage] ?? { label: stage, tone: 'default' as const };
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Pill tone={s.tone}>
        {stage === 'LIVE' && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
        {s.label}
      </Pill>
      {note && (
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
          {note}
        </span>
      )}
    </span>
  );
}
