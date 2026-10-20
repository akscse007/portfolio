import Link from 'next/link';
import { prisma } from '@/lib/db';
import { AdminHeader, StatusPill } from '@/components/admin/fields';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Overview' };

function toMap(rows: { status: string; _count: { _all: number } }[]) {
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Record<string, number>;
}

export default async function AdminHome() {
  const [
    projects,
    achievements,
    posts,
    videos,
    media,
    messages,
    drafts,
    recentMessages,
    privateCertificates,
  ] = await Promise.all([
    prisma.project.groupBy({ by: ['status'], _count: { _all: true } }).then(toMap),
    prisma.achievement.groupBy({ by: ['status'], _count: { _all: true } }).then(toMap),
    prisma.post.groupBy({ by: ['status'], _count: { _all: true } }).then(toMap),
    prisma.video.groupBy({ by: ['status'], _count: { _all: true } }).then(toMap),
    prisma.mediaAsset.count(),
    prisma.contactMessage.count({ where: { status: 'NEW' } }),
    prisma.post.findMany({
      where: { status: 'DRAFT' },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, updatedAt: true },
    }),
    prisma.contactMessage.findMany({
      where: { status: { in: ['NEW', 'READ'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.achievement.count({ where: { previewApproved: false, assets: { some: {} } } }),
  ]);

  const cards = [
    { label: 'Projects', href: '/admin/projects', c: projects },
    { label: 'Achievements', href: '/admin/achievements', c: achievements },
    { label: 'Posts', href: '/admin/posts', c: posts },
    { label: 'Videos', href: '/admin/videos', c: videos },
  ];

  return (
    <div>
      <AdminHeader
        title="Overview"
        description="Published versus draft content, items waiting for review and the latest messages."
        actions={
          <>
            <Link href="/admin/posts/new" className="btn-primary btn-sm">
              New post
            </Link>
            <Link href="/admin/achievements/new" className="btn-ghost btn-sm">
              New achievement
            </Link>
          </>
        }
      />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label}>
            <Link href={c.href} className="block rounded-sm border border-line p-5 hover:border-fg">
              <p className="label">{c.label}</p>
              <p className="mt-2 font-display text-4xl font-bold" style={{ fontStretch: '72%' }}>
                {c.c.PUBLISHED ?? 0}
                <span className="ml-2 text-base font-normal text-muted">published</span>
              </p>
              <p className="mt-1 text-xs text-muted">
                {c.c.DRAFT ?? 0} draft · {c.c.ARCHIVED ?? 0} archived
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-sm border border-line p-5">
          <h2 className="label-accent">Needs review</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex justify-between gap-3">
              <Link href="/admin/messages" className="hover:text-accent">
                New messages
              </Link>
              <span className="font-mono">{messages}</span>
            </li>
            <li className="flex justify-between gap-3">
              <Link href="/admin/achievements?status=DRAFT" className="hover:text-accent">
                Draft achievements
              </Link>
              <span className="font-mono">{achievements.DRAFT ?? 0}</span>
            </li>
            <li className="flex justify-between gap-3">
              <Link href="/admin/achievements" className="hover:text-accent">
                Certificates with unapproved previews
              </Link>
              <span className="font-mono">{privateCertificates}</span>
            </li>
            <li className="flex justify-between gap-3">
              <Link href="/admin/media" className="hover:text-accent">
                Files in media library
              </Link>
              <span className="font-mono">{media}</span>
            </li>
          </ul>
        </section>
        <section className="rounded-sm border border-line p-5">
          <h2 className="label-accent">Recent drafts</h2>
          {drafts.length ? (
            <ul className="mt-4 space-y-3 text-sm">
              {drafts.map((d) => (
                <li key={d.id} className="flex justify-between gap-3">
                  <Link href={`/admin/posts/${d.id}`} className="truncate hover:text-accent">
                    {d.title}
                  </Link>
                  <span className="shrink-0 text-xs text-muted">{formatDate(d.updatedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">No drafts.</p>
          )}
        </section>
        <section className="rounded-sm border border-line p-5">
          <h2 className="label-accent">Latest messages</h2>
          {recentMessages.length ? (
            <ul className="mt-4 space-y-3 text-sm">
              {recentMessages.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/admin/messages?open=${m.id}`}
                    className="flex items-center justify-between gap-3 hover:text-accent"
                  >
                    <span className="truncate">{m.subject}</span>
                    <StatusPill status={m.status} />
                  </Link>
                  <p className="text-xs text-muted">
                    {m.name} · {formatDate(m.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">Inbox is empty.</p>
          )}
        </section>
      </div>
    </div>
  );
}
