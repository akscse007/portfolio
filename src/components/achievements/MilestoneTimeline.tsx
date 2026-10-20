import Link from 'next/link';
import type { PublicAchievement } from '@/server/repos/public';
import { achievementDate } from './AchievementCard';

const STREAMS: Record<string, { label: string; tone: string }> = {
  ACADEMIC: { label: 'Academic', tone: 'bg-blue' },
  COURSE_SPECIALIZATION: { label: 'Technical', tone: 'bg-signal' },
  PROFESSIONAL_CERTIFICATION: { label: 'Technical', tone: 'bg-signal' },
  WORKSHOP_TRAINING: { label: 'Technical', tone: 'bg-signal' },
  RESEARCH_INTERNSHIP: { label: 'Research', tone: 'bg-signal' },
  HACKATHON_COMPETITION: { label: 'Technical', tone: 'bg-signal' },
  AWARD_HONOUR: { label: 'Recognition', tone: 'bg-fg' },
  LEADERSHIP_VOLUNTEERING: { label: 'Leadership', tone: 'bg-muted' },
  SPORTS_EXTRACURRICULAR: { label: 'Leadership', tone: 'bg-muted' },
  OTHER: { label: 'Milestone', tone: 'bg-muted' },
};

/** Year-grouped milestone timeline. Vertical on all sizes; two columns from md. Undated records are grouped last. */
export function MilestoneTimeline({ achievements }: { achievements: PublicAchievement[] }) {
  const groups = new Map<string, PublicAchievement[]>();
  for (const a of achievements) {
    const key = a.year ? String(a.year) : 'Undated';
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  const keys = Array.from(groups.keys()).sort((a, b) =>
    a === 'Undated' ? 1 : b === 'Undated' ? -1 : Number(b) - Number(a),
  );
  if (!keys.length) return null;
  return (
    <ol className="relative border-l border-line pl-6 md:pl-10">
      {keys.map((year) => (
        <li key={year} className="relative pb-12 last:pb-0">
          <span
            aria-hidden
            className="absolute -left-[calc(1.5rem+6px)] top-1.5 h-3 w-3 rounded-full border-2 border-accent bg-bg md:-left-[calc(2.5rem+6px)]"
          />
          <h3
            className="font-display text-4xl font-bold leading-none"
            style={{ fontStretch: '72%' }}
          >
            {year}
          </h3>
          <ul className="mt-5 grid gap-x-10 gap-y-4 md:grid-cols-2">
            {groups.get(year)!.map((a) => {
              const stream = STREAMS[a.category] ?? STREAMS.OTHER!;
              return (
                <li key={a.slug} className="flex gap-3">
                  <span
                    aria-hidden
                    className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${stream.tone}`}
                  />
                  <div>
                    <Link
                      href={`/achievements/${a.slug}`}
                      className="font-medium hover:text-accent"
                    >
                      {a.title}
                    </Link>
                    <p className="label mt-0.5">
                      {stream.label} · {a.issuer}
                      {achievementDate(a) ? ` · ${achievementDate(a)}` : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}
