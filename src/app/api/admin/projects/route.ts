import { adminRoute, json, readJson } from '@/lib/api';
import { projectSchema } from '@/lib/validation/schemas';
import { listProjectsAdmin, saveProject } from '@/server/services/projects';

export const GET = adminRoute(async () => json({ projects: await listProjectsAdmin() }));

export const POST = adminRoute(async (req, { session }) => {
  const input = projectSchema.parse(await readJson(req));
  const project = await saveProject(input, session.user.id);
  return json({ project }, { status: 201 });
});
