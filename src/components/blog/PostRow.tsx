import Link from 'next/link';
import type { PostCard } from '@/server/repos/public';
import { formatDate } from '@/lib/utils';

export const DIFFICULTY_LABEL: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export function DifficultyMeter({ level }: { level: string }) {
  const n = level === 'ADVANCED' ? 3 : level === 'INTERMEDIATE' ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-1.5" title={DIFFICULTY_LABEL[level]}>
      <span className="inline-flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-2.5 w-1 rounded-[1px] ${i <= n ? 'bg-accent' : 'bg-line'}`} />
        ))}
      </span>
      <span>{DIFFICULTY_LABEL[level]}</span>
    </span>
  );
}

export function PostRow({
  post,
  headingLevel: H = 'h3',
}: {
  post: PostCard;
  headingLevel?: 'h2' | 'h3';
}) {
  return (
    <article className="group relative grid gap-3 border-b border-line py-7 md:grid-cols-12 md:gap-8">
      <div className="label flex flex-wrap items-center gap-x-3 gap-y-1 md:col-span-3 md:flex-col md:items-start">
        <span>{post.topic?.name ?? 'Notes'}</span>
        <span>{formatDate(post.publishedAt)}</span>
      </div>
      <div className="md:col-span-7">
        <H className="font-display text-2xl font-semibold leading-tight md:text-3xl">
          <Link
            href={`/blog/${post.slug}`}
            className="after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
          >
            {post.title}
          </Link>
        </H>
        {post.excerpt && <p className="mt-2 line-clamp-2 text-fg/75">{post.excerpt}</p>}
        {post.series && (
          <p className="annot mt-3">
            Series · {post.series.title}
            {post.series.order ? ` · Part ${post.series.order}` : ''}
          </p>
        )}
      </div>
      <div className="label flex items-center gap-4 md:col-span-2 md:flex-col md:items-end">
        <DifficultyMeter level={post.difficulty} />
        <span>{post.readingMinutes} min read</span>
      </div>
    </article>
  );
}
