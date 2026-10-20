import { adminRoute, json, readJson } from '@/lib/api';
import { previewSchema } from '@/lib/validation/schemas';
import { renderMarkdown } from '@/lib/markdown';
import { readingMinutes } from '@/lib/utils';

/** Renders Markdown with the exact public pipeline (sanitised) for the editor's live preview. */
export const POST = adminRoute(async (req) => {
  const { content } = previewSchema.parse(await readJson(req, 2_000_000));
  const rendered = await renderMarkdown(content);
  return json({ ...rendered, readingMinutes: readingMinutes(content) });
});
