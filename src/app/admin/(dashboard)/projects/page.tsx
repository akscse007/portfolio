import Link from 'next/link';
import { listProjectsAdmin } from '@/server/services/projects';
import { AdminHeader } from '@/components/admin/fields';
import { ProjectsTable } from './ProjectsTable';

export const metadata = { title: 'Projects' };

export default async function AdminProjectsPage() {
  const projects = await listProjectsAdmin();
  return (
    <div>
      <AdminHeader
        title="Projects"
        description="Case studies shown on /work. Drafts and archived projects are never visible publicly. Use the arrows to set the display order."
        actions={
          <Link href="/admin/projects/new" className="btn-primary btn-sm">
            New project
          </Link>
        }
      />
      <ProjectsTable
        initial={projects.map((p) => ({ ...p, updatedAt: p.updatedAt.toISOString() }))}
      />
    </div>
  );
}
