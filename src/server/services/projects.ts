import 'server-only';
import { prisma } from '@/lib/db';
import { HttpError } from '@/lib/api';
import type { ProjectInput } from '@/lib/validation/schemas';
import { TAGS } from '@/server/repos/public';
import { audit, ensureSkills, ensureTags, nextPublishedAt, revalidate } from './common';
import { recomputeMediaVisibility } from './media';

export async function listProjectsAdmin() {
  return prisma.project.findMany({
    orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      stage: true,
      status: true,
      featured: true,
      order: true,
      updatedAt: true,
    },
  });
}

export async function getProjectAdmin(id: string) {
  const p = await prisma.project.findUnique({
    where: { id },
    include: {
      skills: { include: { skill: true } },
      tags: { include: { tag: true } },
      media: { orderBy: { order: 'asc' }, include: { media: true } },
      cover: true,
      previewVideo: true,
    },
  });
  if (!p) throw new HttpError(404, 'Project not found');
  return p;
}

async function relatedMediaIds(projectId: string) {
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    select: { coverId: true, previewVideoId: true, media: { select: { mediaId: true } } },
  });
  return p ? [p.coverId, p.previewVideoId, ...p.media.map((m) => m.mediaId)] : [];
}

export async function saveProject(input: ProjectInput, userId: string, id?: string) {
  const before = id ? await relatedMediaIds(id) : [];
  const existing = id ? await prisma.project.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new HttpError(404, 'Project not found');

  const project = await prisma.$transaction(async (tx) => {
    const tagIds = await ensureTags(tx, input.tags);
    const skillIds = await ensureSkills(tx, input.skills);
    const { tags: _t, skills: _s, mediaIds, ...fields } = input;
    const data = {
      ...fields,
      coverId: fields.coverId ?? null,
      previewVideoId: fields.previewVideoId ?? null,
      publishedAt: nextPublishedAt(input.status, existing?.publishedAt),
    };
    const saved = id
      ? await tx.project.update({ where: { id }, data })
      : await tx.project.create({ data });

    await tx.projectTag.deleteMany({ where: { projectId: saved.id } });
    await tx.projectSkill.deleteMany({ where: { projectId: saved.id } });
    if (tagIds.length)
      await tx.projectTag.createMany({
        data: tagIds.map((tagId) => ({ projectId: saved.id, tagId })),
      });
    if (skillIds.length)
      await tx.projectSkill.createMany({
        data: skillIds.map((skillId) => ({ projectId: saved.id, skillId })),
      });

    await tx.projectMedia.deleteMany({ where: { projectId: saved.id } });
    if (mediaIds.length) {
      const found = await tx.mediaAsset.findMany({
        where: { id: { in: mediaIds } },
        select: { id: true },
      });
      const valid = new Set(found.map((m) => m.id));
      await tx.projectMedia.createMany({
        data: mediaIds
          .filter((m) => valid.has(m))
          .map((mediaId, order) => ({ projectId: saved.id, mediaId, order })),
      });
    }
    return saved;
  });

  await recomputeMediaVisibility([...before, ...(await relatedMediaIds(project.id))]);
  await audit(userId, id ? 'update' : 'create', 'project', project.id, { status: project.status });
  revalidate([TAGS.projects, TAGS.cv], ['/', '/work', `/work/${project.slug}`, '/sitemap.xml']);
  if (existing && existing.slug !== project.slug) revalidate([], [`/work/${existing.slug}`]);
  return project;
}

export async function setProjectStatus(
  id: string,
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  userId: string,
) {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Project not found');
  const project = await prisma.project.update({
    where: { id },
    data: { status, publishedAt: nextPublishedAt(status, existing.publishedAt) },
  });
  await recomputeMediaVisibility(await relatedMediaIds(id));
  await audit(userId, `status:${status}`, 'project', id);
  revalidate([TAGS.projects, TAGS.cv], ['/', '/work', `/work/${project.slug}`]);
  return project;
}

export async function deleteProject(id: string, userId: string) {
  const media = await relatedMediaIds(id);
  const project = await prisma.project.delete({ where: { id } });
  await recomputeMediaVisibility(media);
  await audit(userId, 'delete', 'project', id, { slug: project.slug });
  revalidate([TAGS.projects, TAGS.cv], ['/', '/work', `/work/${project.slug}`]);
  return project;
}

export async function reorderProjects(ids: string[], userId: string) {
  await prisma.$transaction(
    ids.map((id, order) => prisma.project.update({ where: { id }, data: { order } })),
  );
  await audit(userId, 'reorder', 'project', null, { count: ids.length });
  revalidate([TAGS.projects], ['/', '/work']);
}
