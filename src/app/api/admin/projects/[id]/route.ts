import { adminRoute, json, readJson } from '@/lib/api';
import { projectSchema, publishStatus } from '@/lib/validation/schemas';
import {
  deleteProject,
  getProjectAdmin,
  saveProject,
  setProjectStatus,
} from '@/server/services/projects';
import { z } from 'zod';

type P = { id: string };

export const GET = adminRoute<P>(async (_req, { params }) =>
  json({ project: await getProjectAdmin(params.id) }),
);

export const PUT = adminRoute<P>(async (req, { session, params }) => {
  const input = projectSchema.parse(await readJson(req));
  return json({ project: await saveProject(input, session.user.id, params.id) });
});

/** PATCH { status } — publish / unpublish / archive. */
export const PATCH = adminRoute<P>(async (req, { session, params }) => {
  const { status } = z.object({ status: publishStatus }).parse(await readJson(req));
  return json({ project: await setProjectStatus(params.id, status, session.user.id) });
});

export const DELETE = adminRoute<P>(async (_req, { session, params }) => {
  await deleteProject(params.id, session.user.id);
  return json({ ok: true });
});
