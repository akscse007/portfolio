import Link from 'next/link';
import { listLibraryNotesAdmin } from '@/server/services/library';
import { AdminHeader, StatusPill } from '@/components/admin/fields';
import { ResponsiveTable } from '@/components/admin/ResponsiveTable';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Library' };

export default async function AdminLibraryPage() {
  const notes = await listLibraryNotesAdmin();
  return (
    <div>
      <AdminHeader
        title="PDF Library"
        description="Downloadable PDF notes for juniors. Drafts are not visible on the public library page."
        actions={
          <Link href="/admin/library/new" className="btn-primary btn-sm">
            New note
          </Link>
        }
      />
      <ResponsiveTable
        caption="Library notes"
        empty="No library notes yet."
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'status', label: 'Status' },
          { key: 'meta', label: 'Details' },
          { key: 'updated', label: 'Updated' },
          { key: 'actions', label: 'Actions', className: 'md:text-right' },
        ]}
        rows={notes.map((n) => ({
          id: n.id,
          cells: {
            title: (
              <div>
                <Link href={`/admin/library/${n.id}`} className="font-medium hover:text-accent">
                  {n.title}
                </Link>
                <p className="text-xs text-muted">/{n.slug}</p>
              </div>
            ),
            status: <StatusPill status={n.status} />,
            meta: (
              <span className="text-xs text-muted">
                {n.subject} · {n.category}{n.featured ? ' · featured' : ''}
              </span>
            ),
            updated: <span className="text-xs text-muted">{formatDate(n.updatedAt)}</span>,
            actions: (
              <span className="flex flex-wrap gap-1 md:justify-end">
                <Link href={`/admin/library/${n.id}`} className="btn-ghost btn-sm">
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
