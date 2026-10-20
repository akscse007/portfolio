import { describe, expect, it } from 'vitest';
import {
  achievementSchema,
  contactSchema,
  httpUrl,
  parseVideoId,
  postSchema,
  projectSchema,
  slugSchema,
  videoSchema,
} from '@/lib/validation/schemas';

describe('slugSchema', () => {
  it('accepts lowercase hyphenated slugs', () => {
    expect(slugSchema.parse('linear-algebra-101')).toBe('linear-algebra-101');
  });
  it.each([
    'Upper',
    'double--hyphen',
    '-leading',
    'trailing-',
    'with space',
    'a',
    '../etc',
    'ünicode',
  ])('rejects %s', (s) => {
    expect(slugSchema.safeParse(s).success).toBe(false);
  });
});

describe('httpUrl', () => {
  it('accepts https URLs', () =>
    expect(httpUrl.parse('https://iic-caluniv.in/')).toBe('https://iic-caluniv.in/'));
  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>',
    'file:///etc/passwd',
    'ftp://x.y',
    'not a url',
  ])('rejects %s', (u) => {
    expect(httpUrl.safeParse(u).success).toBe(false);
  });
});

describe('parseVideoId', () => {
  it('extracts YouTube IDs from common URL shapes', () => {
    expect(parseVideoId('YOUTUBE', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    );
    expect(parseVideoId('YOUTUBE', 'https://youtu.be/dQw4w9WgXcQ?t=3')).toBe('dQw4w9WgXcQ');
    expect(parseVideoId('YOUTUBE', 'https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    );
  });
  it('extracts Vimeo IDs', () => {
    expect(parseVideoId('VIMEO', 'https://vimeo.com/123456789')).toBe('123456789');
    expect(parseVideoId('VIMEO', 'https://player.vimeo.com/video/123456789')).toBe('123456789');
  });
  it('rejects other hosts and malformed IDs', () => {
    expect(parseVideoId('YOUTUBE', 'https://evil.example/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseVideoId('YOUTUBE', 'https://youtube.com/watch?v=<script>')).toBeNull();
    expect(parseVideoId('VIMEO', 'javascript:alert(1)')).toBeNull();
  });
});

describe('contactSchema', () => {
  const base = {
    name: 'Asha',
    email: 'asha@example.com',
    subject: 'Hello there',
    message: 'This is a sufficiently long message.',
    startedAt: Date.now(),
  };
  it('accepts a valid message and normalises email', () => {
    expect(contactSchema.parse({ ...base, email: 'ASHA@Example.com ' }).email).toBe(
      'asha@example.com',
    );
  });
  it('rejects a filled honeypot', () => {
    expect(contactSchema.safeParse({ ...base, website: 'http://spam' }).success).toBe(false);
  });
  it('rejects short messages and bad emails', () => {
    expect(contactSchema.safeParse({ ...base, message: 'too short' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...base, email: 'nope' }).success).toBe(false);
  });
});

describe('content schemas', () => {
  it('project rejects unsafe live URLs', () => {
    const r = projectSchema.safeParse({
      slug: 'x-project',
      title: 'Project',
      summary: 'A valid summary text',
      category: 'Full Stack',
      stage: 'LIVE',
      liveUrl: 'javascript:alert(1)',
    });
    expect(r.success).toBe(false);
  });

  it('achievement defaults keep everything private', () => {
    const a = achievementSchema.parse({
      slug: 'cert',
      title: 'Cert',
      category: 'COURSE_SPECIALIZATION',
      issuer: 'Issuer',
    });
    expect(a.status).toBe('DRAFT');
    expect(a.previewApproved).toBe(false);
    expect(a.documentPublic).toBe(false);
    expect(a.showCredentialId).toBe(false);
    expect(a.showVerification).toBe(false);
    expect(a.verified).toBe(false);
  });

  it('achievement rejects an expiry before the issue date', () => {
    const r = achievementSchema.safeParse({
      slug: 'cert',
      title: 'Cert',
      category: 'OTHER',
      issuer: 'Issuer',
      issueDate: '2026-06-01',
      expirationDate: '2025-01-01',
    });
    expect(r.success).toBe(false);
  });

  it('post defaults to draft', () => {
    expect(postSchema.parse({ slug: 'hello', title: 'Hello world' }).status).toBe('DRAFT');
  });

  it('video requires a valid provider URL or an uploaded file', () => {
    expect(
      videoSchema.safeParse({
        slug: 'v',
        title: 'Video',
        provider: 'YOUTUBE',
        externalUrl: 'https://example.com',
      }).success,
    ).toBe(false);
    expect(videoSchema.safeParse({ slug: 'v-1', title: 'Video', provider: 'UPLOAD' }).success).toBe(
      false,
    );
    expect(
      videoSchema.safeParse({
        slug: 'v-1',
        title: 'Video',
        provider: 'YOUTUBE',
        externalUrl: 'https://youtu.be/dQw4w9WgXcQ',
      }).success,
    ).toBe(true);
  });
});
