import 'server-only';
import { prisma } from '@/lib/db';
import { HttpError } from '@/lib/api';
import type { PostInput } from '@/lib/validation/schemas';
import { readingMinutes } from '@/lib/utils';
import { TAGS } from '@/server/repos/public';
import { audit, ensureTags, nextPublishedAt, revalidate } from './common';
import { mediaIdsInMarkdown, recomputeMediaVisibility } from './media';

const MAX_REVISIONS = 50;

const PATHS = (slug?: string) => [
  '/',
  '/blog',
  ...(slug ? [`/blog/${slug}`] : []),
  '/feed.xml',
  '/atom.xml',
  '/sitemap.xml',
];

export async function listPostsAdmin() {
  return prisma.post.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      featured: true,
      difficulty: true,
      readingMinutes: true,
      publishedAt: true,
      updatedAt: true,
      topic: { select: { name: true } },
    },
  });
}

export async function getPostAdmin(id: string) {
  const p = await prisma.post.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      projects: { select: { projectId: true } },
      revisions: {
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, reason: true, createdAt: true, title: true },
      },
    },
  });
  if (!p) throw new HttpError(404, 'Post not found');
  return p;
}

async function snapshot(postId: string, reason: string) {
  const p = await prisma.post.findUnique({
    where: { id: postId },
    select: { title: true, excerpt: true, content: true },
  });
  if (!p) return;
  const last = await prisma.postRevision.findFirst({
    where: { postId },
    orderBy: { createdAt: 'desc' },
  });
  if (last && last.content === p.content && last.title === p.title && last.excerpt === p.excerpt)
    return;
  await prisma.postRevision.create({ data: { postId, reason, ...p } });
  const old = await prisma.postRevision.findMany({
    where: { postId },
    orderBy: { createdAt: 'desc' },
    skip: MAX_REVISIONS,
    select: { id: true },
  });
  if (old.length)
    await prisma.postRevision.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
}

function postMedia(p: { coverId: string | null; content: string }) {
  return [p.coverId, ...mediaIdsInMarkdown(p.content)];
}

export async function savePost(input: PostInput, userId: string, id?: string) {
  const existing = id ? await prisma.post.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new HttpError(404, 'Post not found');
  const beforeMedia = existing ? postMedia(existing) : [];

  const saved = await prisma.$transaction(async (tx) => {
    const tagIds = await ensureTags(tx, input.tags);
    const { tags: _t, projectIds, publishedAt: requestedPublishedAt, ...fields } = input;
    const data = {
      ...fields,
      topicId: fields.topicId ?? null,
      seriesId: fields.seriesId ?? null,
      seriesOrder: fields.seriesId ? (fields.seriesOrder ?? null) : null,
      coverId: fields.coverId ?? null,
      readingMinutes: readingMinutes(fields.content),
      publishedAt: nextPublishedAt(
        input.status,
        existing?.publishedAt,
        requestedPublishedAt ?? null,
      ),
    };
    const p = id ? await tx.post.update({ where: { id }, data }) : await tx.post.create({ data });
    await tx.postTag.deleteMany({ where: { postId: p.id } });
    if (tagIds.length)
      await tx.postTag.createMany({ data: tagIds.map((tagId) => ({ postId: p.id, tagId })) });
    await tx.postProject.deleteMany({ where: { postId: p.id } });
    if (projectIds.length)
      await tx.postProject.createMany({
        data: projectIds.map((projectId) => ({ postId: p.id, projectId })),
        skipDuplicates: true,
      });
    return p;
  });

  await snapshot(
    saved.id,
    saved.status === 'PUBLISHED' && existing?.status !== 'PUBLISHED' ? 'publish' : 'save',
  );
  await recomputeMediaVisibility([...beforeMedia, ...postMedia(saved)]);
  await audit(userId, id ? 'update' : 'create', 'post', saved.id, { status: saved.status });
  revalidate([TAGS.posts, TAGS.topics, TAGS.projects, TAGS.achievements], PATHS(saved.slug));
  if (existing && existing.slug !== saved.slug) revalidate([], [`/blog/${existing.slug}`]);
  return saved;
}

/**
 * Autosave. Drafts are updated in place; for published posts the autosave is stored
 * as a revision only, so half-written edits never go live.
 */
export async function autosavePost(
  id: string,
  data: { title: string; excerpt: string; content: string },
) {
  const p = await prisma.post.findUnique({ where: { id } });
  if (!p) throw new HttpError(404, 'Post not found');
  if (p.status === 'PUBLISHED') {
    const last = await prisma.postRevision.findFirst({
      where: { postId: id, reason: 'autosave' },
      orderBy: { createdAt: 'desc' },
    });
    if (last && Date.now() - last.createdAt.getTime() < 60_000) {
      await prisma.postRevision.update({
        where: { id: last.id },
        data: { ...data, createdAt: new Date() },
      });
    } else {
      await prisma.postRevision.create({ data: { postId: id, reason: 'autosave', ...data } });
    }
    return { mode: 'revision' as const, savedAt: new Date().toISOString() };
  }
  await prisma.post.update({
    where: { id },
    data: { ...data, readingMinutes: readingMinutes(data.content) },
  });
  return { mode: 'draft' as const, savedAt: new Date().toISOString() };
}

export async function setPostStatus(
  id: string,
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  userId: string,
) {
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Post not found');
  const p = await prisma.post.update({
    where: { id },
    data: { status, publishedAt: nextPublishedAt(status, existing.publishedAt) },
  });
  if (status === 'PUBLISHED') await snapshot(id, 'publish');
  await recomputeMediaVisibility(postMedia(p));
  await audit(userId, `status:${status}`, 'post', id);
  revalidate([TAGS.posts, TAGS.topics], PATHS(p.slug));
  return p;
}

export async function restoreRevision(postId: string, revisionId: string, userId: string) {
  const rev = await prisma.postRevision.findFirst({ where: { id: revisionId, postId } });
  if (!rev) throw new HttpError(404, 'Revision not found');
  await snapshot(postId, 'save');
  const p = await prisma.post.update({
    where: { id: postId },
    data: {
      title: rev.title,
      excerpt: rev.excerpt,
      content: rev.content,
      readingMinutes: readingMinutes(rev.content),
    },
  });
  await snapshot(postId, 'restore');
  await recomputeMediaVisibility(postMedia(p));
  await audit(userId, 'restore-revision', 'post', postId, { revisionId });
  revalidate([TAGS.posts], PATHS(p.slug));
  return p;
}

export async function getRevision(postId: string, revisionId: string) {
  const rev = await prisma.postRevision.findFirst({ where: { id: revisionId, postId } });
  if (!rev) throw new HttpError(404, 'Revision not found');
  return rev;
}

export async function deletePost(id: string, userId: string) {
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Post not found');
  const media = postMedia(existing);
  await prisma.post.delete({ where: { id } });
  await recomputeMediaVisibility(media);
  await audit(userId, 'delete', 'post', id, { slug: existing.slug });
  revalidate([TAGS.posts, TAGS.topics], PATHS(existing.slug));
  return existing;
}
