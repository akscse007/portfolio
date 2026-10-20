import 'server-only';
import type { z } from 'zod';
import { prisma } from '@/lib/db';
import { HttpError } from '@/lib/api';
import {
  parseVideoId,
  type VideoInput,
  type educationSchema,
  type experienceSchema,
  type profileSchema,
  type settingsSchema,
  type skillSchema,
  type topicSchema,
  type seriesSchema,
} from '@/lib/validation/schemas';
import { TAGS } from '@/server/repos/public';
import { audit, ensureTags, nextPublishedAt, revalidate } from './common';
import { recomputeMediaVisibility } from './media';

// ── Videos ────────────────────────────────────────────────────

export async function saveVideo(input: VideoInput, userId: string, id?: string) {
  const existing = id ? await prisma.video.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new HttpError(404, 'Video not found');
  const externalId =
    input.provider === 'UPLOAD' ? null : parseVideoId(input.provider, input.externalUrl);
  if (input.fileId) {
    const f = await prisma.mediaAsset.findUnique({ where: { id: input.fileId } });
    if (!f || f.kind !== 'VIDEO') throw new HttpError(422, 'The selected file is not a video');
  }
  if (input.captionsId) {
    const c = await prisma.mediaAsset.findUnique({ where: { id: input.captionsId } });
    if (!c || c.mimeType !== 'text/vtt')
      throw new HttpError(422, 'Captions must be a WebVTT (.vtt) file');
  }
  const saved = await prisma.$transaction(async (tx) => {
    const tagIds = await ensureTags(tx, input.tags);
    const { tags: _t, externalUrl: _u, ...fields } = input;
    const data = {
      ...fields,
      externalId,
      fileId: input.provider === 'UPLOAD' ? (fields.fileId ?? null) : null,
      posterId: fields.posterId ?? null,
      captionsId: fields.captionsId ?? null,
      projectId: fields.projectId ?? null,
      durationSeconds: fields.durationSeconds ?? null,
      transcript: fields.transcript ?? null,
      publishedAt: nextPublishedAt(input.status, existing?.publishedAt),
    };
    const v = id ? await tx.video.update({ where: { id }, data }) : await tx.video.create({ data });
    await tx.videoTag.deleteMany({ where: { videoId: v.id } });
    if (tagIds.length)
      await tx.videoTag.createMany({ data: tagIds.map((tagId) => ({ videoId: v.id, tagId })) });
    return v;
  });
  await recomputeMediaVisibility([
    existing?.fileId,
    existing?.posterId,
    existing?.captionsId,
    saved.fileId,
    saved.posterId,
    saved.captionsId,
  ]);
  await audit(userId, id ? 'update' : 'create', 'video', saved.id, { status: saved.status });
  revalidate([TAGS.videos, TAGS.projects], ['/demos']);
  return saved;
}

export async function deleteVideo(id: string, userId: string) {
  const v = await prisma.video.delete({ where: { id } });
  await recomputeMediaVisibility([v.fileId, v.posterId, v.captionsId]);
  await audit(userId, 'delete', 'video', id);
  revalidate([TAGS.videos], ['/demos']);
  return v;
}

// ── Experience / Education / Skills ───────────────────────────

type ExperienceInput = z.infer<typeof experienceSchema>;
type EducationInput = z.infer<typeof educationSchema>;
type SkillInput = z.infer<typeof skillSchema>;

export async function saveExperience(input: ExperienceInput, userId: string, id?: string) {
  const data = { ...input, location: input.location ?? null };
  const row = id
    ? await prisma.experience.update({ where: { id }, data })
    : await prisma.experience.create({ data });
  await audit(userId, id ? 'update' : 'create', 'experience', row.id);
  revalidate([TAGS.cv], ['/', '/about', '/resume']);
  return row;
}

export async function deleteExperience(id: string, userId: string) {
  await prisma.experience.delete({ where: { id } });
  await audit(userId, 'delete', 'experience', id);
  revalidate([TAGS.cv], ['/', '/about', '/resume']);
}

export async function saveEducation(input: EducationInput, userId: string, id?: string) {
  const data = { ...input, result: input.result ?? null, note: input.note ?? null };
  const row = id
    ? await prisma.education.update({ where: { id }, data })
    : await prisma.education.create({ data });
  await audit(userId, id ? 'update' : 'create', 'education', row.id);
  revalidate([TAGS.cv], ['/about', '/resume']);
  return row;
}

export async function deleteEducation(id: string, userId: string) {
  await prisma.education.delete({ where: { id } });
  await audit(userId, 'delete', 'education', id);
  revalidate([TAGS.cv], ['/about', '/resume']);
}

export async function saveSkill(input: SkillInput, userId: string, id?: string) {
  const row = id
    ? await prisma.skill.update({ where: { id }, data: input })
    : await prisma.skill.create({ data: input });
  await audit(userId, id ? 'update' : 'create', 'skill', row.id);
  revalidate([TAGS.cv, TAGS.projects], ['/about']);
  return row;
}

export async function deleteSkill(id: string, userId: string) {
  await prisma.skill.delete({ where: { id } });
  await audit(userId, 'delete', 'skill', id);
  revalidate([TAGS.cv, TAGS.projects], ['/about']);
}

// ── Topics / Series ───────────────────────────────────────────

export async function saveTopic(input: z.infer<typeof topicSchema>, userId: string, id?: string) {
  const row = id
    ? await prisma.topic.update({ where: { id }, data: input })
    : await prisma.topic.create({ data: input });
  await audit(userId, id ? 'update' : 'create', 'topic', row.id);
  revalidate([TAGS.topics, TAGS.posts], ['/blog', `/topics/${row.slug}`]);
  return row;
}

export async function deleteTopic(id: string, userId: string) {
  const t = await prisma.topic.delete({ where: { id } });
  await audit(userId, 'delete', 'topic', id);
  revalidate([TAGS.topics, TAGS.posts], ['/blog', `/topics/${t.slug}`]);
}

export async function saveSeries(input: z.infer<typeof seriesSchema>, userId: string, id?: string) {
  const data = { ...input, topicId: input.topicId ?? null };
  const row = id
    ? await prisma.series.update({ where: { id }, data })
    : await prisma.series.create({ data });
  await audit(userId, id ? 'update' : 'create', 'series', row.id);
  revalidate([TAGS.topics, TAGS.posts], ['/blog']);
  return row;
}

export async function deleteSeries(id: string, userId: string) {
  await prisma.series.delete({ where: { id } });
  await audit(userId, 'delete', 'series', id);
  revalidate([TAGS.topics, TAGS.posts], ['/blog']);
}

// ── Profile & settings ───────────────────────────────────────

export async function saveProfile(input: z.infer<typeof profileSchema>, userId: string) {
  const before = await prisma.profile.findUnique({ where: { id: 'default' } });
  if (input.cvMediaId) {
    const cv = await prisma.mediaAsset.findUnique({ where: { id: input.cvMediaId } });
    if (!cv || cv.kind !== 'PDF') throw new HttpError(422, 'The CV must be a PDF');
  }
  const data = {
    ...input,
    cvMediaId: input.cvMediaId ?? null,
    portraitMediaId: input.portraitMediaId ?? null,
    availabilityLabel: input.availabilityLabel ?? null,
  };
  const row = await prisma.profile.upsert({
    where: { id: 'default' },
    update: data,
    create: { id: 'default', ...data },
  });
  await recomputeMediaVisibility([
    before?.cvMediaId,
    before?.portraitMediaId,
    row.cvMediaId,
    row.portraitMediaId,
  ]);
  await audit(userId, 'update', 'profile', 'default');
  revalidate([TAGS.profile], ['/', '/about', '/resume', '/contact']);
  return row;
}

export async function saveSettings(input: z.infer<typeof settingsSchema>, userId: string) {
  const before = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const data = {
    ...input,
    defaultOgMediaId: input.defaultOgMediaId ?? null,
    footerNote: input.footerNote ?? null,
    analyticsNote: input.analyticsNote ?? null,
    twitterHandle: input.twitterHandle ?? null,
  };
  const row = await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: data,
    create: { id: 'default', ...data },
  });
  await recomputeMediaVisibility([before?.defaultOgMediaId, row.defaultOgMediaId]);
  await audit(userId, 'update', 'settings', 'default');
  revalidate([TAGS.settings], ['/']);
  return row;
}

// ── Messages ──────────────────────────────────────────────────

export async function setMessageStatus(
  id: string,
  status: 'NEW' | 'READ' | 'ARCHIVED' | 'SPAM',
  userId: string,
) {
  const row = await prisma.contactMessage.update({ where: { id }, data: { status } });
  await audit(userId, `status:${status}`, 'message', id);
  return row;
}

export async function deleteMessage(id: string, userId: string) {
  await prisma.contactMessage.delete({ where: { id } });
  await audit(userId, 'delete', 'message', id);
}
