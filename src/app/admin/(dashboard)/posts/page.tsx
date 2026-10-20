import Link from 'next/link';
import { listPostsAdmin } from '@/server/services/posts';
import { AdminHeader, StatusPill } from '@/components/admin/fields';
import { ResponsiveTable } from '@/components/admin/ResponsiveTable';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Posts' };

export default async function AdminPostsPage() {
  const posts = await listPostsAdmin();
  return (
    <div>
      <AdminHeader
        title="Posts"
        description="Educational articles. Drafts are never exposed by public pages, feeds, the sitemap or APIs."
        actions={
          <Link href="/admin/posts/new" className="btn-primary btn-sm">
            New post
          </Link>
        }
      />
      <ResponsiveTable
        caption="Posts"
        empty="No posts yet."
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'status', label: 'Status' },
          { key: 'meta', label: 'Details' },
          { key: 'updated', label: 'Updated' },
          { key: 'actions', label: 'Actions', className: 'md:text-right' },
        ]}
        rows={posts.map((p) => ({
          id: p.id,
          cells: {
            title: (
              <div>
                <Link href={`/admin/posts/${p.id}`} className="font-medium hover:text-accent">
                  {p.title}
                </Link>
                <p className="text-xs text-muted">/{p.slug}</p>
              </div>
            ),
            status: <StatusPill status={p.status} />,
            meta: (
              <span className="text-xs text-muted">
                {p.topic?.name ?? 'No topic'} · {p.difficulty.toLowerCase()} · {p.readingMinutes}{' '}
                min{p.featured ? ' · featured' : ''}
              </span>
            ),
            updated: <span className="text-xs text-muted">{formatDate(p.updatedAt)}</span>,
            actions: (
              <span className="flex flex-wrap gap-1 md:justify-end">
                <a
                  href={`/admin/preview/posts/${p.id}`}
                  target="_blank"
                  rel="noopener"
                  className="btn-ghost btn-sm"
                >
                  Preview
                </a>
                {p.status === 'PUBLISHED' && (
                  <a
                    href={`/blog/${p.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="btn-ghost btn-sm"
                  >
                    View
                  </a>
                )}
                <Link href={`/admin/posts/${p.id}`} className="btn-ghost btn-sm">
                  Edit
                </Link>
              </span>
            ),
          },
        }))}
      />
    </div>
  );
}
