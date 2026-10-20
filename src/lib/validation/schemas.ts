import { z } from 'zod';
import { SLUG_RE } from '@/lib/utils';

// ── primitives ────────────────────────────────────────────────

export const slugSchema = z
  .string()
  .trim()
  .min(2, 'Slug must be at least 2 characters')
  .max(96, 'Slug must be at most 96 characters')
  .regex(SLUG_RE, 'Use lowercase letters, numbers and single hyphens only');

/** http(s) URL only — rejects javascript:, data:, file: and friends. */
export const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .url('Must be a valid URL')
  .refine((v) => /^https?:\/\//i.test(v), 'Only http(s) URLs are allowed');

export const optionalUrl = z
  .union([httpUrl, z.literal(''), z.null()])
  .optional()
  .transform((v) => (v ? v : null));

const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v);

export const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable());

export const optionalDate = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : v),
  z.coerce.date().nullable(),
);

export const markdown = (max = 200_000) => z.string().max(max).default('');

export const stringList = (maxItems = 50, maxLen = 120) =>
  z
    .array(z.string().trim().min(1).max(maxLen))
    .max(maxItems)
    .default([])
    .transform((arr) => Array.from(new Set(arr)));

export const cuidLike = z
  .string()
  .min(5)
  .max(40)
  .regex(/^[a-z0-9]+$/i, 'Invalid id');

export const publishStatus = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

// ── auth ──────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
  next: z.string().max(512).optional(),
});

// ── contact ───────────────────────────────────────────────────

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please tell me your name').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
  subject: z.string().trim().min(3, 'Add a short subject').max(150),
  message: z
    .string()
    .trim()
    .min(20, 'A little more detail helps (20+ characters)')
    .max(5000, 'Please keep it under 5000 characters'),
  // anti-spam
  website: z.string().max(0, 'Spam detected').optional().default(''),
  startedAt: z.coerce.number().int().positive(),
});

// ── projects ──────────────────────────────────────────────────

export const PROJECT_CATEGORIES = [
  'Full Stack',
  'AI/ML',
  'Research',
  'FinTech',
  'Developer Tools',
] as const;

export const projectSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(2).max(140),
  subtitle: z.string().trim().max(200).default(''),
  summary: z.string().trim().min(10).max(600),
  category: z.enum(PROJECT_CATEGORIES),
  stage: z.enum(['LIVE', 'IN_PROGRESS', 'RESEARCH', 'PROTOTYPE', 'ARCHIVED']),
  stageNote: optionalText(200),
  role: z.string().trim().max(200).default(''),
  period: z.string().trim().max(80).default(''),
  problem: markdown(),
  solution: markdown(),
  architecture: markdown(),
  contribution: markdown(),
  decisions: markdown(),
  challenges: markdown(),
  lessons: markdown(),
  liveUrl: optionalUrl,
  repoUrl: optionalUrl,
  coverId: z.preprocess(emptyToNull, cuidLike.nullable()).optional(),
  accent: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(/^#[0-9a-f]{6}$/i, 'Use a hex colour like #c6f432')
      .nullable(),
  ),
  status: publishStatus.default('DRAFT'),
  featured: z.boolean().default(false),
  order: z.coerce.number().int().min(0).max(10_000).default(0),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  skills: stringList(40, 60),
  tags: stringList(20, 40),
  mediaIds: z.array(cuidLike).max(40).default([]),
});
export type ProjectInput = z.infer<typeof projectSchema>;

// ── achievements ─────────────────────────────────────────────

export const ACHIEVEMENT_CATEGORIES = [
  'PROFESSIONAL_CERTIFICATION',
  'COURSE_SPECIALIZATION',
  'ACADEMIC',
  'RESEARCH_INTERNSHIP',
  'AWARD_HONOUR',
  'HACKATHON_COMPETITION',
  'LEADERSHIP_VOLUNTEERING',
  'WORKSHOP_TRAINING',
  'SPORTS_EXTRACURRICULAR',
  'OTHER',
] as const;
export type AchievementCategoryKey = (typeof ACHIEVEMENT_CATEGORIES)[number];

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategoryKey, string> = {
  PROFESSIONAL_CERTIFICATION: 'Professional Certifications',
  COURSE_SPECIALIZATION: 'Courses & Specializations',
  ACADEMIC: 'Academic Achievements',
  RESEARCH_INTERNSHIP: 'Research & Internship',
  AWARD_HONOUR: 'Awards & Honours',
  HACKATHON_COMPETITION: 'Hackathons & Competitions',
  LEADERSHIP_VOLUNTEERING: 'Leadership & Volunteering',
  WORKSHOP_TRAINING: 'Workshops & Training',
  SPORTS_EXTRACURRICULAR: 'Sports & Extracurricular',
  OTHER: 'Other Milestones',
};

export const achievementSchema = z
  .object({
    slug: slugSchema,
    title: z.string().trim().min(2).max(160),
    category: z.enum(ACHIEVEMENT_CATEGORIES),
    issuer: z.string().trim().min(2).max(160),
    recipientName: z.string().trim().max(120).default('Akash Roy'),
    issueDate: optionalDate,
    dateLabel: optionalText(60),
    expirationDate: optionalDate,
    credentialId: optionalText(120),
    verificationUrl: optionalUrl,
    summary: z.string().trim().max(600).default(''),
    context: markdown(50_000),
    learned: markdown(50_000),
    skillsCovered: stringList(40, 60),
    status: publishStatus.default('DRAFT'),
    featured: z.boolean().default(false),
    order: z.coerce.number().int().min(0).max(10_000).default(0),
    showCredentialId: z.boolean().default(false),
    showVerification: z.boolean().default(false),
    showRecipient: z.boolean().default(true),
    documentPublic: z.boolean().default(false),
    previewApproved: z.boolean().default(false),
    verified: z.boolean().default(false),
    seoTitle: optionalText(70),
    seoDescription: optionalText(170),
    canonicalUrl: optionalUrl,
    tags: stringList(20, 40),
    projectIds: z.array(cuidLike).max(20).default([]),
    postIds: z.array(cuidLike).max(20).default([]),
  })
  .refine((a) => !a.expirationDate || !a.issueDate || a.expirationDate >= a.issueDate, {
    message: 'Expiration must be after the issue date',
    path: ['expirationDate'],
  });
export type AchievementInput = z.infer<typeof achievementSchema>;

export const achievementBulkSchema = z.object({
  ids: z.array(cuidLike).min(1).max(200),
  patch: z
    .object({
      category: z.enum(ACHIEVEMENT_CATEGORIES).optional(),
      status: publishStatus.optional(),
      featured: z.boolean().optional(),
      previewApproved: z.boolean().optional(),
      documentPublic: z.boolean().optional(),
    })
    .refine((p) => Object.keys(p).length > 0, 'Nothing to update'),
});

export const achievementAssetSchema = z.object({
  mediaId: cuidLike,
  role: z.enum(['CERTIFICATE', 'PREVIEW', 'PHOTO', 'GALLERY']),
  order: z.coerce.number().int().min(0).max(1000).default(0),
});

export const reorderSchema = z.object({
  ids: z.array(cuidLike).min(1).max(500),
});

export const cropSchema = z.object({
  mediaId: cuidLike,
  // fractional crop box relative to the original (0..1)
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0.02).max(1),
  height: z.number().min(0.02).max(1),
  alt: z.string().trim().max(300).optional(),
});

// ── blog ──────────────────────────────────────────────────────

export const postSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(3).max(160),
  excerpt: z.string().trim().max(400).default(''),
  content: z.string().max(400_000).default(''),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  topicId: z.preprocess(emptyToNull, cuidLike.nullable()).optional(),
  seriesId: z.preprocess(emptyToNull, cuidLike.nullable()).optional(),
  seriesOrder: z
    .preprocess(emptyToNull, z.coerce.number().int().min(1).max(500).nullable())
    .optional(),
  coverId: z.preprocess(emptyToNull, cuidLike.nullable()).optional(),
  status: publishStatus.default('DRAFT'),
  featured: z.boolean().default(false),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  publishedAt: optionalDate.optional(),
  tags: stringList(20, 40),
  projectIds: z.array(cuidLike).max(20).default([]),
});
export type PostInput = z.infer<typeof postSchema>;

export const autosaveSchema = z.object({
  title: z.string().trim().min(1).max(160),
  excerpt: z.string().trim().max(400).default(''),
  content: z.string().max(400_000),
});

export const previewSchema = z.object({ content: z.string().max(400_000) });

export const topicSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  description: z.string().trim().max(400).default(''),
  group: z.string().trim().min(2).max(60).default('General'),
  order: z.coerce.number().int().min(0).max(1000).default(0),
});

export const seriesSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: slugSchema,
  description: z.string().trim().max(400).default(''),
  topicId: z.preprocess(emptyToNull, cuidLike.nullable()).optional(),
});

// ── videos ────────────────────────────────────────────────────

export const videoSchema = z
  .object({
    slug: slugSchema,
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(2000).default(''),
    category: z.string().trim().min(2).max(60).default('Demo'),
    provider: z.enum(['YOUTUBE', 'VIMEO', 'UPLOAD']),
    externalUrl: z.string().trim().max(2048).optional().default(''),
    fileId: z.preprocess(emptyToNull, cuidLike.nullable()).optional(),
    posterId: z.preprocess(emptyToNull, cuidLike.nullable()).optional(),
    captionsId: z.preprocess(emptyToNull, cuidLike.nullable()).optional(),
    durationSeconds: z
      .preprocess(emptyToNull, z.coerce.number().int().min(1).max(86_400).nullable())
      .optional(),
    transcript: optionalText(100_000),
    projectId: z.preprocess(emptyToNull, cuidLike.nullable()).optional(),
    status: publishStatus.default('DRAFT'),
    featured: z.boolean().default(false),
    order: z.coerce.number().int().min(0).max(10_000).default(0),
    tags: stringList(20, 40),
  })
  .superRefine((v, ctx) => {
    if (v.provider === 'UPLOAD' && !v.fileId)
      ctx.addIssue({ code: 'custom', path: ['fileId'], message: 'Choose an uploaded MP4 file' });
    if (v.provider !== 'UPLOAD' && !parseVideoId(v.provider, v.externalUrl))
      ctx.addIssue({
        code: 'custom',
        path: ['externalUrl'],
        message: `Enter a valid ${v.provider === 'YOUTUBE' ? 'YouTube' : 'Vimeo'} URL`,
      });
  });
export type VideoInput = z.infer<typeof videoSchema>;

/** Extracts a provider video id from a URL. Returns null for anything unexpected. */
export function parseVideoId(
  provider: 'YOUTUBE' | 'VIMEO' | 'UPLOAD',
  input: string,
): string | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
  if (provider === 'YOUTUBE') {
    let id: string | null = null;
    if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0] ?? null;
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else {
        const m = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
        id = m?.[1] ?? null;
      }
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }
  if (provider === 'VIMEO') {
    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
    const m = url.pathname.match(/(?:^|\/)(\d{6,12})(?:\/|$)/);
    return m?.[1] ?? null;
  }
  return null;
}

// ── CV ────────────────────────────────────────────────────────

export const experienceSchema = z.object({
  organization: z.string().trim().min(2).max(200),
  role: z.string().trim().min(2).max(160),
  kind: z.enum(['WORK', 'RESEARCH', 'FREELANCE', 'LEADERSHIP', 'VOLUNTEER']),
  location: optionalText(120),
  period: z.string().trim().min(2).max(80),
  startDate: optionalDate,
  endDate: optionalDate,
  current: z.boolean().default(false),
  summary: z.string().trim().max(2000).default(''),
  highlights: stringList(20, 600),
  url: optionalUrl,
  visible: z.boolean().default(true),
  order: z.coerce.number().int().min(0).max(1000).default(0),
});

export const educationSchema = z.object({
  institution: z.string().trim().min(2).max(200),
  credential: z.string().trim().min(2).max(200),
  period: z.string().trim().min(2).max(80),
  result: optionalText(80),
  note: optionalText(400),
  visible: z.boolean().default(true),
  order: z.coerce.number().int().min(0).max(1000).default(0),
});

export const skillSchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: slugSchema,
  group: z.string().trim().min(2).max(60),
  order: z.coerce.number().int().min(0).max(1000).default(0),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  headline: z.string().trim().min(2).max(200),
  tagline: z.string().trim().min(2).max(120),
  subTagline: z.string().trim().max(200),
  location: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(2).max(60),
  shortBio: z.string().trim().max(600),
  bio: markdown(30_000),
  researchInterests: stringList(20, 120),
  email: z.preprocess(emptyToNull, z.string().trim().email().max(254).nullable()),
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  cvMediaId: z.preprocess(emptyToNull, cuidLike.nullable()).optional(),
  cvUrl: optionalUrl,
  portraitMediaId: z.preprocess(emptyToNull, cuidLike.nullable()).optional(),
  availabilityOn: z.boolean().default(false),
  availabilityLabel: optionalText(80),
  showClock: z.boolean().default(true),
});

export const settingsSchema = z.object({
  siteTitle: z.string().trim().min(2).max(120),
  siteDescription: z.string().trim().min(10).max(300),
  siteUrl: optionalUrl,
  defaultOgMediaId: z.preprocess(emptyToNull, cuidLike.nullable()).optional(),
  twitterHandle: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .regex(/^@?[A-Za-z0-9_]{1,15}$/, 'Invalid handle')
      .nullable(),
  ),
  contactEnabled: z.boolean().default(true),
  contactAutoReply: z.boolean().default(false),
  footerNote: optionalText(300),
  analyticsNote: optionalText(300),
});

export const mediaUpdateSchema = z.object({
  alt: z.string().trim().max(300).default(''),
  caption: optionalText(500),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
});

export const messageUpdateSchema = z.object({
  status: z.enum(['NEW', 'READ', 'ARCHIVED', 'SPAM']),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12).max(256),
});
