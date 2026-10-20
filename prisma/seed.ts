/**
 * Deterministic, idempotent seed. Safe to run repeatedly: records are upserted by
 * unique keys and existing owner edits to published content are not overwritten
 * unless SEED_OVERWRITE=true.
 *
 *   npm run db:seed
 *
 * Options (environment variables):
 *   SEED_OVERWRITE=true         re-apply seed text to existing records
 *   SEED_PUBLISH_SAMPLES=true   publish sample posts & achievements (LOCAL PREVIEW ONLY)
 *
 * No admin user is created here — use `npm run admin:create`.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { profile, settings, education, experience, skills } from './seed-data/profile';
import { projects } from './seed-data/projects';
import { achievements } from './seed-data/achievements';
import { topics, series, posts } from './seed-data/blog';

const prisma = new PrismaClient();
const OVERWRITE = process.env.SEED_OVERWRITE === 'true';
const PUBLISH_SAMPLES = process.env.SEED_PUBLISH_SAMPLES === 'true';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function readingMinutes(md: string) {
  return Math.max(1, Math.round(md.split(/\s+/).filter(Boolean).length / 220));
}

async function ensureTag(name: string) {
  const slug = slugify(name);
  return prisma.tag.upsert({ where: { slug }, update: {}, create: { name, slug } });
}

async function main() {
  if (PUBLISH_SAMPLES && process.env.NODE_ENV === 'production') {
    throw new Error(
      'SEED_PUBLISH_SAMPLES is for local previews only and is refused in production.',
    );
  }

  // Profile & settings
  await prisma.profile.upsert({
    where: { id: 'default' },
    update: OVERWRITE ? profile : {},
    create: { id: 'default', ...profile },
  });
  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: OVERWRITE ? settings : {},
    create: { id: 'default', ...settings },
  });

  // Education & experience
  for (const e of education) {
    const { id, ...data } = e;
    await prisma.education.upsert({
      where: { id },
      update: OVERWRITE ? data : {},
      create: { id, ...data },
    });
  }
  for (const e of experience) {
    const { id, ...data } = e;
    await prisma.experience.upsert({
      where: { id },
      update: OVERWRITE ? data : {},
      create: { id, ...data },
    });
  }

  // Skills
  for (const g of skills) {
    for (const [order, name] of g.names.entries()) {
      const slug = slugify(name);
      await prisma.skill.upsert({
        where: { slug },
        update: OVERWRITE ? { name, group: g.group, order } : {},
        create: { name, slug, group: g.group, order },
      });
    }
  }

  // Projects
  for (const p of projects) {
    const { skills: skillNames, tags, ...data } = p;
    const fields = {
      ...data,
      problem: data.problem ?? '',
      solution: data.solution ?? '',
      architecture: data.architecture ?? '',
      contribution: data.contribution ?? '',
      decisions: data.decisions ?? '',
      challenges: data.challenges ?? '',
      lessons: data.lessons ?? '',
      liveUrl: data.liveUrl ?? null,
      repoUrl: data.repoUrl ?? null,
      stageNote: data.stageNote ?? null,
      publishedAt: data.status === 'PUBLISHED' ? new Date('2026-10-01T00:00:00+05:30') : null,
    };
    const existing = await prisma.project.findUnique({ where: { slug: p.slug } });
    const project = existing
      ? OVERWRITE
        ? await prisma.project.update({ where: { slug: p.slug }, data: fields })
        : existing
      : await prisma.project.create({ data: fields });
    if (!existing || OVERWRITE) {
      await prisma.projectSkill.deleteMany({ where: { projectId: project.id } });
      for (const name of skillNames) {
        const skill = await prisma.skill.upsert({
          where: { slug: slugify(name) },
          update: {},
          create: { name, slug: slugify(name), group: 'Other' },
        });
        await prisma.projectSkill.create({ data: { projectId: project.id, skillId: skill.id } });
      }
      await prisma.projectTag.deleteMany({ where: { projectId: project.id } });
      for (const name of tags) {
        const tag = await ensureTag(name);
        await prisma.projectTag.create({ data: { projectId: project.id, tagId: tag.id } });
      }
    }
  }

  // Achievements (drafts unless SEED_PUBLISH_SAMPLES)
  for (const a of achievements) {
    const { projectSlugs, ...data } = a;
    const fields = {
      ...data,
      dateLabel: data.dateLabel ?? null,
      skillsCovered: data.skillsCovered ?? [],
      featured: data.featured ?? false,
      status: PUBLISH_SAMPLES ? ('PUBLISHED' as const) : ('DRAFT' as const),
      publishedAt: PUBLISH_SAMPLES ? new Date() : null,
    };
    const existing = await prisma.achievement.findUnique({ where: { slug: a.slug } });
    const row = existing
      ? OVERWRITE || PUBLISH_SAMPLES
        ? await prisma.achievement.update({
            where: { slug: a.slug },
            data: OVERWRITE
              ? fields
              : { status: fields.status, publishedAt: existing.publishedAt ?? fields.publishedAt },
          })
        : existing
      : await prisma.achievement.create({ data: fields });
    for (const slug of projectSlugs ?? []) {
      const project = await prisma.project.findUnique({ where: { slug } });
      if (project)
        await prisma.achievementProject.upsert({
          where: { achievementId_projectId: { achievementId: row.id, projectId: project.id } },
          update: {},
          create: { achievementId: row.id, projectId: project.id },
        });
    }
  }

  // Topics, series, posts
  for (const [order, t] of topics.entries()) {
    await prisma.topic.upsert({
      where: { slug: t.slug },
      update: OVERWRITE ? { ...t, order } : {},
      create: { ...t, order },
    });
  }
  for (const s of series) {
    const topic = await prisma.topic.findUnique({ where: { slug: s.topicSlug } });
    const { topicSlug: _t, ...data } = s;
    await prisma.series.upsert({
      where: { slug: s.slug },
      update: OVERWRITE ? { ...data, topicId: topic?.id ?? null } : {},
      create: { ...data, topicId: topic?.id ?? null },
    });
  }
  const postsDir = path.join(__dirname, 'seed-data', 'posts');
  for (const p of posts) {
    const content = readFileSync(path.join(postsDir, `${p.slug}.md`), 'utf8');
    const topic = await prisma.topic.findUnique({ where: { slug: p.topicSlug } });
    const s = p.seriesSlug
      ? await prisma.series.findUnique({ where: { slug: p.seriesSlug } })
      : null;
    const fields = {
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      content,
      difficulty: p.difficulty,
      readingMinutes: readingMinutes(content),
      topicId: topic?.id ?? null,
      seriesId: s?.id ?? null,
      seriesOrder: p.seriesOrder ?? null,
      featured: p.featured ?? false,
      status: PUBLISH_SAMPLES ? ('PUBLISHED' as const) : ('DRAFT' as const),
      publishedAt: PUBLISH_SAMPLES
        ? new Date(Date.now() - (posts.length - posts.indexOf(p)) * 86400000)
        : null,
    };
    const existing = await prisma.post.findUnique({ where: { slug: p.slug } });
    const row = existing
      ? OVERWRITE || PUBLISH_SAMPLES
        ? await prisma.post.update({
            where: { slug: p.slug },
            data: OVERWRITE
              ? fields
              : { status: fields.status, publishedAt: existing.publishedAt ?? fields.publishedAt },
          })
        : existing
      : await prisma.post.create({ data: fields });
    if (!existing || OVERWRITE) {
      await prisma.postTag.deleteMany({ where: { postId: row.id } });
      for (const name of p.tags) {
        const tag = await ensureTag(name);
        await prisma.postTag.create({ data: { postId: row.id, tagId: tag.id } });
      }
      for (const slug of p.projectSlugs ?? []) {
        const project = await prisma.project.findUnique({ where: { slug } });
        if (project)
          await prisma.postProject.upsert({
            where: { postId_projectId: { postId: row.id, projectId: project.id } },
            update: {},
            create: { postId: row.id, projectId: project.id },
          });
      }
      if (!existing)
        await prisma.postRevision.create({
          data: {
            postId: row.id,
            title: row.title,
            excerpt: row.excerpt,
            content: row.content,
            reason: 'save',
          },
        });
    }
  }

  const counts = await Promise.all([
    prisma.project.count(),
    prisma.achievement.count(),
    prisma.post.count(),
    prisma.topic.count(),
    prisma.skill.count(),
  ]);
  console.log(
    `Seed complete: ${counts[0]} projects, ${counts[1]} achievements, ${counts[2]} posts, ${counts[3]} topics, ${counts[4]} skills.` +
      (PUBLISH_SAMPLES ? ' (sample posts & achievements PUBLISHED for local preview)' : ''),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
