import 'server-only';
import { unstable_cache } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { publicMediaUrl } from '@/server/services/media';
import { ACHIEVEMENT_CATEGORY_LABELS, type AchievementCategoryKey } from '@/lib/validation/schemas';
import { yearOf } from '@/lib/utils';

/**
 * PUBLIC READ MODEL
 * Every function here returns plain DTOs built from PUBLISHED records only, with
 * private fields removed. Pages and public APIs must use this module — never Prisma directly.
 */

export const TAGS = {
  profile: 'profile',
  settings: 'settings',
  projects: 'projects',
  achievements: 'achievements',
  posts: 'posts',
  videos: 'videos',
  cv: 'cv',
  topics: 'topics',
  library: 'library',
} as const;

const PUBLISHED = { status: 'PUBLISHED' as const };
const REVALIDATE = 300;

type MediaRow = {
  id: string;
  kind: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  alt: string;
  caption: string | null;
  visibility: string;
};

export type PublicImage = {
  id: string;
  kind: 'IMAGE' | 'PDF' | 'VIDEO' | 'DOCUMENT';
  mimeType: string;
  width: number | null;
  height: number | null;
  alt: string;
  caption: string | null;
  thumb: string;
  display: string;
  original: string;
};

export function toPublicImage(m: MediaRow | null | undefined, force = false): PublicImage | null {
  if (!m || (!force && m.visibility !== 'PUBLIC')) return null;
  return {
    id: m.id,
    kind: m.kind as PublicImage['kind'],
    mimeType: m.mimeType,
    width: m.width,
    height: m.height,
    alt: m.alt,
    caption: m.caption,
    thumb: publicMediaUrl(m.id, m.kind === 'IMAGE' ? 'thumb' : 'original')!,
    display: publicMediaUrl(m.id, m.kind === 'IMAGE' ? 'display' : 'original')!,
    original: publicMediaUrl(m.id, 'original')!,
  };
}

const mediaSelect = {
  id: true,
  kind: true,
  mimeType: true,
  width: true,
  height: true,
  alt: true,
  caption: true,
  visibility: true,
} satisfies Prisma.MediaAssetSelect;

// ─────────────────────────────────────────────────────────────
// Profile / settings / CV
// ─────────────────────────────────────────────────────────────

export type PublicProfile = Awaited<ReturnType<typeof loadProfile>>;

async function loadProfile() {
  const p = await prisma.profile.findUnique({
    where: { id: 'default' },
    include: { cvMedia: { select: mediaSelect }, portrait: { select: mediaSelect } },
  });
  if (!p) return null;
  const cv = toPublicImage(p.cvMedia);
  return {
    name: p.name,
    headline: p.headline,
    tagline: p.tagline,
    subTagline: p.subTagline,
    location: p.location,
    timezone: p.timezone,
    shortBio: p.shortBio,
    bio: p.bio,
    researchInterests: p.researchInterests,
    email: p.email,
    githubUrl: p.githubUrl,
    linkedinUrl: p.linkedinUrl,
    cvUrl: cv ? cv.original : p.cvUrl,
    portrait: toPublicImage(p.portrait),
    availability: p.availabilityOn && p.availabilityLabel ? p.availabilityLabel : null,
    showClock: p.showClock,
  };
}
export const getProfile = unstable_cache(loadProfile, ['profile'], {
  tags: [TAGS.profile],
  revalidate: REVALIDATE,
});

async function loadSettings() {
  const s = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
    include: { defaultOgImage: { select: mediaSelect } },
  });
  if (!s) return null;
  return {
    siteTitle: s.siteTitle,
    siteDescription: s.siteDescription,
    siteUrl: s.siteUrl,
    ogImage: toPublicImage(s.defaultOgImage),
    twitterHandle: s.twitterHandle,
    contactEnabled: s.contactEnabled,
    footerNote: s.footerNote,
  };
}
export const getSettings = unstable_cache(loadSettings, ['settings'], {
  tags: [TAGS.settings],
  revalidate: REVALIDATE,
});

async function loadCv() {
  const [experience, education, skills] = await Promise.all([
    prisma.experience.findMany({
      where: { visible: true },
      orderBy: [{ order: 'asc' }, { startDate: 'desc' }],
    }),
    prisma.education.findMany({ where: { visible: true }, orderBy: { order: 'asc' } }),
    prisma.skill.findMany({
      orderBy: [{ group: 'asc' }, { order: 'asc' }, { name: 'asc' }],
      include: {
        projects: {
          where: { project: PUBLISHED },
          select: { project: { select: { slug: true, title: true } } },
        },
      },
    }),
  ]);
  return {
    experience: experience.map((e) => ({
      id: e.id,
      organization: e.organization,
      role: e.role,
      kind: e.kind,
      location: e.location,
      period: e.period,
      current: e.current,
      summary: e.summary,
      highlights: e.highlights,
      url: e.url,
    })),
    education: education.map((e) => ({
      id: e.id,
      institution: e.institution,
      credential: e.credential,
      period: e.period,
      result: e.result,
      note: e.note,
    })),
    skills: skills.map((s) => ({
      name: s.name,
      slug: s.slug,
      group: s.group,
      projects: s.projects.map((p) => p.project),
    })),
  };
}
export const getCv = unstable_cache(loadCv, ['cv'], {
  tags: [TAGS.cv, TAGS.projects],
  revalidate: REVALIDATE,
});

// ─────────────────────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────────────────────

const projectCardInclude = {
  cover: { select: mediaSelect },
  previewVideo: { select: mediaSelect },
  skills: { select: { skill: { select: { name: true, slug: true } } } },
  tags: { select: { tag: { select: { name: true, slug: true } } } },
} satisfies Prisma.ProjectInclude;

type ProjectCardRow = Prisma.ProjectGetPayload<{ include: typeof projectCardInclude }>;

function toProjectCard(p: ProjectCardRow) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    summary: p.summary,
    category: p.category,
    stage: p.stage,
    stageNote: p.stageNote,
    role: p.role,
    period: p.period,
    liveUrl: p.liveUrl,
    repoUrl: p.repoUrl,
    accent: p.accent,
    featured: p.featured,
    cover: toPublicImage(p.cover),
    previewVideo: toPublicImage(p.previewVideo),
    skills: p.skills.map((s) => s.skill),
    tags: p.tags.map((t) => t.tag),
  };
}
export type ProjectCard = ReturnType<typeof toProjectCard>;

export const getProjects = unstable_cache(
  async () => {
    const rows = await prisma.project.findMany({
      where: PUBLISHED,
      include: projectCardInclude,
      orderBy: [{ featured: 'desc' }, { order: 'asc' }, { publishedAt: 'desc' }],
    });
    return rows.map(toProjectCard);
  },
  ['projects'],
  { tags: [TAGS.projects], revalidate: REVALIDATE },
);

export const getProject = unstable_cache(
  async (slug: string) => {
    const p = await prisma.project.findFirst({
      where: { slug, ...PUBLISHED },
      include: {
        ...projectCardInclude,
        media: { orderBy: { order: 'asc' }, include: { media: { select: mediaSelect } } },
        achievements: {
          where: { achievement: PUBLISHED },
          select: { achievement: { select: { slug: true, title: true, issuer: true } } },
        },
        posts: {
          where: { post: PUBLISHED },
          select: { post: { select: { slug: true, title: true, excerpt: true } } },
        },
        videos: { where: PUBLISHED, select: { slug: true, title: true } },
      },
    });
    if (!p) return null;
    const all = await prisma.project.findMany({
      where: PUBLISHED,
      select: { slug: true, title: true },
      orderBy: [{ featured: 'desc' }, { order: 'asc' }, { publishedAt: 'desc' }],
    });
    const idx = all.findIndex((x) => x.slug === slug);
    return {
      ...toProjectCard(p),
      problem: p.problem,
      solution: p.solution,
      architecture: p.architecture,
      contribution: p.contribution,
      decisions: p.decisions,
      challenges: p.challenges,
      lessons: p.lessons,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      updatedAt: p.updatedAt.toISOString(),
      publishedAt: p.publishedAt?.toISOString() ?? null,
      gallery: p.media
        .map((m) => {
          const img = toPublicImage(m.media);
          return img ? { ...img, caption: m.caption ?? img.caption } : null;
        })
        .filter((x): x is PublicImage => Boolean(x)),
      achievements: p.achievements.map((a) => a.achievement),
      posts: p.posts.map((x) => x.post),
      videos: p.videos,
      prev: idx > 0 ? all[idx - 1]! : null,
      next: idx >= 0 && idx < all.length - 1 ? all[idx + 1]! : null,
    };
  },
  ['project'],
  { tags: [TAGS.projects], revalidate: REVALIDATE },
);
export type ProjectDetail = NonNullable<Awaited<ReturnType<typeof getProject>>>;

// ─────────────────────────────────────────────────────────────
// Achievements
// ─────────────────────────────────────────────────────────────

const achievementInclude = {
  assets: {
    orderBy: [{ role: 'asc' }, { order: 'asc' }],
    include: { media: { select: mediaSelect } },
  },
  tags: { select: { tag: { select: { name: true, slug: true } } } },
} satisfies Prisma.AchievementInclude;
type AchievementRow = Prisma.AchievementGetPayload<{ include: typeof achievementInclude }>;

/**
 * Builds the public view of an achievement:
 * - credential id / verification link / recipient only when explicitly enabled
 * - preview/photo/gallery images only when the owner approved them (and the asset is public)
 * - the original document only when `documentPublic` is set
 */
export function toPublicAchievement(a: AchievementRow, opts: { includePrivate?: boolean } = {}) {
  const force = Boolean(opts.includePrivate);
  const byRole = (role: string) => a.assets.filter((x) => x.role === role);
  const approved = a.previewApproved || force;
  const previews = approved
    ? byRole('PREVIEW')
        .map((x) => toPublicImage(x.media, force))
        .filter(Boolean)
    : [];
  const photos = approved
    ? byRole('PHOTO')
        .map((x) => toPublicImage(x.media, force))
        .filter(Boolean)
    : [];
  const gallery = approved
    ? byRole('GALLERY')
        .map((x) => toPublicImage(x.media, force))
        .filter(Boolean)
    : [];
  const certificateAsset = byRole('CERTIFICATE')[0]?.media;
  const document = a.documentPublic || force ? toPublicImage(certificateAsset, force) : null;
  // If the original is itself a public image, it can serve as the preview.
  const preview =
    (previews[0] as PublicImage | undefined) ??
    (document && document.kind === 'IMAGE' ? document : null);
  const category = a.category as AchievementCategoryKey;
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    category,
    categoryLabel: ACHIEVEMENT_CATEGORY_LABELS[category],
    issuer: a.issuer,
    recipientName: a.showRecipient ? a.recipientName : null,
    issueDate: a.issueDate?.toISOString() ?? null,
    dateLabel: a.dateLabel,
    year:
      yearOf(a.issueDate) ??
      (a.dateLabel?.match(/(19|20)\d{2}/)?.[0]
        ? Number(a.dateLabel.match(/(19|20)\d{2}/)![0])
        : null),
    expirationDate: a.expirationDate?.toISOString() ?? null,
    credentialId: a.showCredentialId || force ? a.credentialId : null,
    verificationUrl: a.showVerification || force ? a.verificationUrl : null,
    verified: a.verified,
    summary: a.summary,
    context: a.context,
    learned: a.learned,
    skills: a.skillsCovered,
    featured: a.featured,
    order: a.order,
    preview,
    photos: photos as PublicImage[],
    gallery: gallery as PublicImage[],
    document,
    hasCertificate: Boolean(certificateAsset),
    tags: a.tags.map((t) => t.tag),
    seoTitle: a.seoTitle,
    seoDescription: a.seoDescription,
    canonicalUrl: a.canonicalUrl,
    updatedAt: a.updatedAt.toISOString(),
    createdAt: a.createdAt.toISOString(),
  };
}
export type PublicAchievement = ReturnType<typeof toPublicAchievement>;

export const getAchievements = unstable_cache(
  async () => {
    const rows = await prisma.achievement.findMany({
      where: PUBLISHED,
      include: achievementInclude,
      orderBy: [{ featured: 'desc' }, { order: 'asc' }, { issueDate: 'desc' }],
    });
    return rows.map((r) => toPublicAchievement(r));
  },
  ['achievements'],
  { tags: [TAGS.achievements], revalidate: REVALIDATE },
);

export const achievementDetailInclude = {
  ...achievementInclude,
  projects: {
    where: { project: PUBLISHED },
    select: { project: { select: { slug: true, title: true, summary: true } } },
  },
  posts: {
    where: { post: PUBLISHED },
    select: { post: { select: { slug: true, title: true, excerpt: true } } },
  },
} satisfies Prisma.AchievementInclude;

export const getAchievement = unstable_cache(
  async (slug: string) => {
    const a = await prisma.achievement.findFirst({
      where: { slug, ...PUBLISHED },
      include: {
        ...achievementInclude,
        projects: {
          where: { project: PUBLISHED },
          select: { project: { select: { slug: true, title: true, summary: true } } },
        },
        posts: {
          where: { post: PUBLISHED },
          select: { post: { select: { slug: true, title: true, excerpt: true } } },
        },
      },
    });
    if (!a) return null;
    const all = await prisma.achievement.findMany({
      where: PUBLISHED,
      select: { slug: true, title: true },
      orderBy: [{ featured: 'desc' }, { order: 'asc' }, { issueDate: 'desc' }],
    });
    const idx = all.findIndex((x) => x.slug === slug);
    return {
      ...toPublicAchievement(a),
      projects: a.projects.map((p) => p.project),
      posts: a.posts.map((p) => p.post),
      prev: idx > 0 ? all[idx - 1]! : null,
      next: idx >= 0 && idx < all.length - 1 ? all[idx + 1]! : null,
    };
  },
  ['achievement'],
  { tags: [TAGS.achievements], revalidate: REVALIDATE },
);
export type AchievementDetail = NonNullable<Awaited<ReturnType<typeof getAchievement>>>;

// ─────────────────────────────────────────────────────────────
// Blog
// ─────────────────────────────────────────────────────────────

const postCardSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  difficulty: true,
  readingMinutes: true,
  featured: true,
  publishedAt: true,
  updatedAt: true,
  seriesOrder: true,
  topic: { select: { name: true, slug: true, group: true } },
  series: { select: { title: true, slug: true } },
  tags: { select: { tag: { select: { name: true, slug: true } } } },
  cover: { select: mediaSelect },
} satisfies Prisma.PostSelect;
type PostCardRow = Prisma.PostGetPayload<{ select: typeof postCardSelect }>;

function toPostCard(p: PostCardRow) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    difficulty: p.difficulty,
    readingMinutes: p.readingMinutes,
    featured: p.featured,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    updatedAt: p.updatedAt.toISOString(),
    topic: p.topic,
    series: p.series ? { ...p.series, order: p.seriesOrder } : null,
    tags: p.tags.map((t) => t.tag),
    cover: toPublicImage(p.cover),
  };
}
export type PostCard = ReturnType<typeof toPostCard>;

const publishedPostWhere = () => ({
  status: 'PUBLISHED' as const,
  publishedAt: { lte: new Date() },
});

export const getPosts = unstable_cache(
  async () => {
    const rows = await prisma.post.findMany({
      where: publishedPostWhere(),
      select: postCardSelect,
      orderBy: { publishedAt: 'desc' },
    });
    return rows.map(toPostCard);
  },
  ['posts'],
  { tags: [TAGS.posts], revalidate: REVALIDATE },
);

export const getPost = unstable_cache(
  async (slug: string) => {
    const p = await prisma.post.findFirst({
      where: { slug, ...publishedPostWhere() },
      select: {
        ...postCardSelect,
        content: true,
        seoTitle: true,
        seoDescription: true,
        topicId: true,
        seriesId: true,
        projects: {
          where: { project: PUBLISHED },
          select: { project: { select: { slug: true, title: true } } },
        },
        achievements: {
          where: { achievement: PUBLISHED },
          select: { achievement: { select: { slug: true, title: true } } },
        },
        attachments: {
          orderBy: { order: 'asc' },
          include: { media: { select: mediaSelect } },
        },
      },
    });
    if (!p) return null;
    const [all, seriesPosts, related] = await Promise.all([
      prisma.post.findMany({
        where: publishedPostWhere(),
        select: { slug: true, title: true },
        orderBy: { publishedAt: 'desc' },
      }),
      p.seriesId
        ? prisma.post.findMany({
            where: { seriesId: p.seriesId, ...publishedPostWhere() },
            select: { slug: true, title: true, seriesOrder: true },
            orderBy: [{ seriesOrder: 'asc' }, { publishedAt: 'asc' }],
          })
        : Promise.resolve([]),
      prisma.post.findMany({
        where: {
          ...publishedPostWhere(),
          slug: { not: slug },
          OR: [
            ...(p.topicId ? [{ topicId: p.topicId }] : []),
            { tags: { some: { tag: { slug: { in: p.tags.map((t) => t.tag.slug) } } } } },
          ],
        },
        select: postCardSelect,
        take: 3,
        orderBy: { publishedAt: 'desc' },
      }),
    ]);
    const idx = all.findIndex((x) => x.slug === slug);
    return {
      ...toPostCard(p),
      content: p.content,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      projects: p.projects.map((x) => x.project),
      achievements: p.achievements.map((x) => x.achievement),
      attachments: p.attachments
        .map((a) => {
          const img = toPublicImage(a.media);
          return img ? { id: a.id, title: a.title, description: a.description, media: img } : null;
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x)),
      newer: idx > 0 ? all[idx - 1]! : null,
      older: idx >= 0 && idx < all.length - 1 ? all[idx + 1]! : null,
      seriesPosts,
      related: related.map(toPostCard),
    };
  },
  ['post'],
  { tags: [TAGS.posts], revalidate: REVALIDATE },
);
export type PostDetail = NonNullable<Awaited<ReturnType<typeof getPost>>>;

export const getTopics = unstable_cache(
  async () => {
    const topics = await prisma.topic.findMany({
      orderBy: [{ group: 'asc' }, { order: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { posts: { where: publishedPostWhere() } } } },
    });
    return topics.map((t) => ({
      name: t.name,
      slug: t.slug,
      description: t.description,
      group: t.group,
      postCount: t._count.posts,
    }));
  },
  ['topics'],
  { tags: [TAGS.topics, TAGS.posts], revalidate: REVALIDATE },
);

export const getTopic = unstable_cache(
  async (slug: string) => {
    const t = await prisma.topic.findUnique({
      where: { slug },
      include: {
        series: {
          include: {
            posts: {
              where: publishedPostWhere(),
              select: {
                slug: true,
                title: true,
                seriesOrder: true,
                difficulty: true,
                readingMinutes: true,
              },
              orderBy: [{ seriesOrder: 'asc' }, { publishedAt: 'asc' }],
            },
          },
        },
      },
    });
    if (!t) return null;
    const posts = await prisma.post.findMany({
      where: { topicId: t.id, ...publishedPostWhere() },
      select: postCardSelect,
      orderBy: [{ seriesOrder: 'asc' }, { publishedAt: 'desc' }],
    });
    return {
      name: t.name,
      slug: t.slug,
      description: t.description,
      group: t.group,
      series: t.series
        .map((s) => ({ title: s.title, slug: s.slug, description: s.description, posts: s.posts }))
        .filter((s) => s.posts.length > 0),
      posts: posts.map(toPostCard),
    };
  },
  ['topic'],
  { tags: [TAGS.topics, TAGS.posts], revalidate: REVALIDATE },
);

// ─────────────────────────────────────────────────────────────
// Videos
// ─────────────────────────────────────────────────────────────

export const getVideos = unstable_cache(
  async () => {
    const rows = await prisma.video.findMany({
      where: PUBLISHED,
      orderBy: [{ featured: 'desc' }, { order: 'asc' }, { publishedAt: 'desc' }],
      include: {
        poster: { select: mediaSelect },
        file: { select: mediaSelect },
        captions: { select: mediaSelect },
        project: { select: { slug: true, title: true, status: true } },
        tags: { select: { tag: { select: { name: true, slug: true } } } },
      },
    });
    return rows.map((v) => ({
      id: v.id,
      slug: v.slug,
      title: v.title,
      description: v.description,
      category: v.category,
      provider: v.provider,
      externalId: v.externalId,
      file: toPublicImage(v.file),
      poster: toPublicImage(v.poster),
      captions: toPublicImage(v.captions),
      durationSeconds: v.durationSeconds,
      transcript: v.transcript,
      featured: v.featured,
      project:
        v.project && v.project.status === 'PUBLISHED'
          ? { slug: v.project.slug, title: v.project.title }
          : null,
      tags: v.tags.map((t) => t.tag),
    }));
  },
  ['videos'],
  { tags: [TAGS.videos], revalidate: REVALIDATE },
);
export type PublicVideo = Awaited<ReturnType<typeof getVideos>>[number];

// ─────────────────────────────────────────────────────────────
// Library notes
// ─────────────────────────────────────────────────────────────

export const getLibraryNotes = unstable_cache(
  async () => {
    const rows = await prisma.libraryNote.findMany({
      where: PUBLISHED,
      orderBy: [{ featured: 'desc' }, { order: 'asc' }, { publishedAt: 'desc' }],
      include: {
        media: { select: { ...mediaSelect, sizeBytes: true, originalName: true } },
        tags: { select: { tag: { select: { name: true, slug: true } } } },
      },
    });
    return rows.map((n) => ({
      id: n.id,
      slug: n.slug,
      title: n.title,
      description: n.description,
      subject: n.subject,
      category: n.category,
      academicLevel: n.academicLevel,
      featured: n.featured,
      publishedAt: n.publishedAt?.toISOString() ?? null,
      media: {
        id: n.media.id,
        mimeType: n.media.mimeType,
        sizeBytes: (n.media as { sizeBytes: number }).sizeBytes,
        originalName: (n.media as { originalName: string }).originalName,
        url: publicMediaUrl(n.media.id, 'original')!,
      },
      tags: n.tags.map((t) => t.tag),
    }));
  },
  ['library-notes'],
  { tags: [TAGS.library], revalidate: REVALIDATE },
);
export type LibraryNoteCard = Awaited<ReturnType<typeof getLibraryNotes>>[number];

// ─────────────────────────────────────────────────────────────
// Sitemap
// ─────────────────────────────────────────────────────────────

export async function getSitemapEntries() {
  const [projects, achievements, posts, topics, libraryNotes] = await Promise.all([
    prisma.project.findMany({ where: PUBLISHED, select: { slug: true, updatedAt: true } }),
    prisma.achievement.findMany({ where: PUBLISHED, select: { slug: true, updatedAt: true } }),
    prisma.post.findMany({ where: publishedPostWhere(), select: { slug: true, updatedAt: true } }),
    prisma.topic.findMany({
      where: { posts: { some: publishedPostWhere() } },
      select: { slug: true },
    }),
    prisma.libraryNote.count({ where: PUBLISHED }),
  ]);
  return { projects, achievements, posts, topics, hasLibrary: libraryNotes > 0 };
}
