import { describe, expect, it } from 'vitest';
import { toPublicAchievement } from '@/server/repos/public';

type Row = Parameters<typeof toPublicAchievement>[0];

const media = (id: string, visibility: 'PUBLIC' | 'PRIVATE', kind = 'IMAGE') => ({
  id,
  kind: kind as 'IMAGE',
  mimeType: kind === 'PDF' ? 'application/pdf' : 'image/png',
  width: 1000,
  height: 700,
  alt: 'alt',
  caption: null,
  visibility,
});

function row(overrides: Partial<Row> = {}): Row {
  const now = new Date();
  return {
    id: 'a1',
    slug: 'cert',
    title: 'Cert',
    category: 'COURSE_SPECIALIZATION',
    issuer: 'Issuer',
    recipientName: 'Akash Roy',
    issueDate: new Date('2026-06-15'),
    dateLabel: null,
    expirationDate: null,
    credentialId: 'SECRET-ID',
    verificationUrl: 'https://coursera.org/verify/SECRET-ID',
    summary: '',
    context: '',
    learned: '',
    skillsCovered: [],
    status: 'PUBLISHED',
    featured: false,
    order: 0,
    showCredentialId: false,
    showVerification: false,
    showRecipient: true,
    documentPublic: false,
    previewApproved: false,
    verified: false,
    seoTitle: null,
    seoDescription: null,
    canonicalUrl: null,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    tags: [],
    assets: [
      {
        id: 'x1',
        achievementId: 'a1',
        mediaId: 'm1',
        role: 'CERTIFICATE',
        order: 0,
        media: media('m1', 'PRIVATE', 'PDF'),
      },
      {
        id: 'x2',
        achievementId: 'a1',
        mediaId: 'm2',
        role: 'PREVIEW',
        order: 0,
        media: media('m2', 'PUBLIC'),
      },
      {
        id: 'x3',
        achievementId: 'a1',
        mediaId: 'm3',
        role: 'PHOTO',
        order: 0,
        media: media('m3', 'PUBLIC'),
      },
    ],
    ...overrides,
  } as Row;
}

describe('public achievement DTO', () => {
  it('hides credential ID, verification link and images by default', () => {
    const a = toPublicAchievement(row());
    expect(a.credentialId).toBeNull();
    expect(a.verificationUrl).toBeNull();
    expect(a.preview).toBeNull();
    expect(a.photos).toHaveLength(0);
    expect(a.document).toBeNull();
    expect(a.hasCertificate).toBe(true);
    expect(JSON.stringify(a)).not.toContain('SECRET-ID');
  });

  it('shows fields only when explicitly enabled', () => {
    const a = toPublicAchievement(
      row({ showCredentialId: true, showVerification: true, previewApproved: true }),
    );
    expect(a.credentialId).toBe('SECRET-ID');
    expect(a.verificationUrl).toContain('coursera.org');
    expect(a.preview?.id).toBe('m2');
    expect(a.photos.map((p) => p.id)).toEqual(['m3']);
  });

  it('never exposes a private asset even when approved', () => {
    const r = row({ previewApproved: true, documentPublic: true });
    r.assets[1]!.media.visibility = 'PRIVATE';
    const a = toPublicAchievement(r);
    expect(a.preview).toBeNull();
    expect(a.document).toBeNull(); // original is PRIVATE in storage metadata
  });

  it('hides the recipient name when requested', () => {
    expect(toPublicAchievement(row({ showRecipient: false })).recipientName).toBeNull();
  });
});
