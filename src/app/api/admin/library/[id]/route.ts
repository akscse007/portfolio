import { z } from 'zod';
import { adminRoute, json, readJson } from '@/lib/api';
import { libraryNoteSchema, publishStatus } from '@/lib/validation/schemas';
import {
  deleteLibraryNote,
  getLibraryNoteAdmin,
  saveLibraryNote,
  setLibraryNoteStatus,
} from '@/server/services/library';

type P = { id: string };

export const GET = adminRoute<P>(async (_req, { params }) =>
  json({ note: await getLibraryNoteAdmin(params.id) }),
);

export const PUT = adminRoute<P>(async (req, { session, params }) => {
  const input = libraryNoteSchema.parse(await readJson(req, 2_000_000));
  const note = await saveLibraryNote(input, session.user.id, params.id);
  return json({ note });
});

export const PATCH = adminRoute<P>(async (req, { session, params }) => {
  const { status } = z.object({ status: publishStatus }).parse(await readJson(req, 1000));
  const note = await setLibraryNoteStatus(params.id, status, session.user.id);
  return json({ note });
});

export const DELETE = adminRoute<P>(async (_req, { session, params }) => {
  await deleteLibraryNote(params.id, session.user.id);
  return json({ ok: true });
});
