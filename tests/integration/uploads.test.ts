import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/db';
import * as mediaApi from '@/app/api/admin/media/route';
import * as mediaItemApi from '@/app/api/admin/media/[id]/route';
import * as achievementsApi from '@/app/api/admin/achievements/route';
import * as achievementApi from '@/app/api/admin/achievements/[id]/route';
import * as assetsApi from '@/app/api/admin/achievements/[id]/assets/route';
import * as cropApi from '@/app/api/admin/achievements/[id]/crop/route';
import * as projectsApi from '@/app/api/admin/projects/route';
import * as projectApi from '@/app/api/admin/projects/[id]/route';
import { GET as serveMedia } from '@/app/media/[id]/route';
import {
  adminSession,
  ctx,
  fileForm,
  json,
  makeRequest,
  minimalPdf,
  pngBuffer,
  resetDb,
} from './helpers';

type Media = {
  id: string;
  key: string;
  visibility: string;
  kind: string;
  variants: Record<string, string> | null;
  width: number | null;
};

beforeEach(resetDb);
afterEach(() => {
  delete process.env.MAX_IMAGE_MB;
});

async function upload(
  s: Awaited<ReturnType<typeof adminSession>>,
  buffer: Buffer,
  name: string,
  type: string,
  extra: Record<string, string> = {},
) {
  const res = await mediaApi.POST(
    makeRequest('/api/admin/media', {
      method: 'POST',
      session: s,
      formData: fileForm(buffer, name, type, extra),
    }),
    ctx(),
  );
  return { res, body: (await json(res)) as { media: Media; error?: string } };
}

const anon = (id: string, v = '') =>
  serveMedia(makeRequest(`/media/${id}${v}`, { origin: null }), ctx({ id }));

describe('uploads', () => {
  it('stores a valid PNG privately with generated variants and stripped metadata', async () => {
    const s = await adminSession();
    const { res, body } = await upload(s, await pngBuffer(1200, 800), 'shot.png', 'image/png', {
      alt: 'A screenshot',
    });
    expect(res.status).toBe(201);
    expect(body.media.visibility).toBe('PRIVATE');
    expect(body.media.width).toBe(1200);
    expect(Object.keys(body.media.variants ?? {})).toEqual(['thumb', 'display']);
    expect(existsSync(path.resolve('storage-test/objects', body.media.key))).toBe(true);
    expect(body.media.key).toMatch(/^\d{4}\/\d{2}\/[A-Za-z0-9_-]+\.png$/);
  });

  it('rejects files whose content does not match an allowed type', async () => {
    const s = await adminSession();
    const fake = await upload(
      s,
      Buffer.from('<svg onload=alert(1)></svg>'.padEnd(64, ' ')),
      'evil.png',
      'image/png',
    );
    expect(fake.res.status).toBe(415);
    const html = await upload(
      s,
      Buffer.from('<html><script>alert(1)</script></html>'),
      'page.pdf',
      'application/pdf',
    );
    expect(html.res.status).toBe(415);
  });

  it('rejects mismatched declared types and restricted kinds', async () => {
    const s = await adminSession();
    const mismatch = await upload(s, minimalPdf(), 'cert.png', 'image/png');
    expect(mismatch.res.status).toBe(415);
    const kind = await upload(s, minimalPdf(), 'cert.pdf', 'application/pdf', { accept: 'IMAGE' });
    expect(kind.res.status).toBe(415);
  });

  it('enforces size limits', async () => {
    process.env.MAX_IMAGE_MB = '0.001';
    const s = await adminSession();
    const big = await upload(s, await pngBuffer(400, 400), 'big.png', 'image/png');
    expect(big.res.status).toBe(413);
  });

  it('accepts PDFs and rejects truncated ones', async () => {
    const s = await adminSession();
    expect((await upload(s, minimalPdf(), 'cert.pdf', 'application/pdf')).res.status).toBe(201);
    const truncated = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n'.padEnd(80, ' '));
    expect((await upload(s, truncated, 'broken.pdf', 'application/pdf')).res.status).toBe(422);
  });

  it('refuses uploads without authentication', async () => {
    const res = await mediaApi.POST(
      makeRequest('/api/admin/media', {
        method: 'POST',
        formData: fileForm(await pngBuffer(), 'x.png', 'image/png'),
      }),
      ctx(),
    );
    expect(res.status).toBe(401);
  });
});

describe('media access control', () => {
  it('private media returns 404 to the public and 200 to the owner', async () => {
    const s = await adminSession();
    const { body } = await upload(s, await pngBuffer(), 'private.png', 'image/png');
    expect((await anon(body.media.id)).status).toBe(404);
    expect((await anon(body.media.id, '?v=thumb')).status).toBe(404);
    const owner = await serveMedia(
      makeRequest(`/media/${body.media.id}`, { session: s }),
      ctx({ id: body.media.id }),
    );
    expect(owner.status).toBe(200);
    expect(owner.headers.get('cache-control')).toContain('no-store');
    expect(owner.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('rejects malformed ids and variants', async () => {
    expect(
      (await serveMedia(makeRequest('/media/../../etc/passwd'), ctx({ id: '../../etc/passwd' })))
        .status,
    ).toBe(404);
    const s = await adminSession();
    const { body } = await upload(s, await pngBuffer(), 'a.png', 'image/png');
    expect(
      (
        await serveMedia(
          makeRequest(`/media/${body.media.id}?v=../../x`, { session: s }),
          ctx({ id: body.media.id }),
        )
      ).status,
    ).toBe(404);
  });

  it('media becomes public only while used by published content', async () => {
    const s = await adminSession();
    const { body } = await upload(s, await pngBuffer(), 'cover.png', 'image/png');
    const created = await projectsApi.POST(
      makeRequest('/api/admin/projects', {
        method: 'POST',
        session: s,
        body: {
          slug: 'proj-p',
          title: 'Proj',
          summary: 'Summary of the project',
          category: 'Full Stack',
          stage: 'LIVE',
          coverId: body.media.id,
        },
      }),
      ctx(),
    );
    const { project } = (await json(created)) as { project: { id: string } };
    expect((await anon(body.media.id)).status).toBe(404); // draft project

    await projectApi.PATCH(
      makeRequest(`/api/admin/projects/${project.id}`, {
        method: 'PATCH',
        session: s,
        body: { status: 'PUBLISHED' },
      }),
      ctx({ id: project.id }),
    );
    const pub = await anon(body.media.id, '?v=display');
    expect(pub.status).toBe(200);
    expect(pub.headers.get('content-type')).toBe('image/webp');
    expect(pub.headers.get('cache-control')).toContain('public');

    await projectApi.PATCH(
      makeRequest(`/api/admin/projects/${project.id}`, {
        method: 'PATCH',
        session: s,
        body: { status: 'DRAFT' },
      }),
      ctx({ id: project.id }),
    );
    expect((await anon(body.media.id)).status).toBe(404);
  });

  it('referenced media cannot be made public manually', async () => {
    const s = await adminSession();
    const { body } = await upload(s, await pngBuffer(), 'cover.png', 'image/png');
    await projectsApi.POST(
      makeRequest('/api/admin/projects', {
        method: 'POST',
        session: s,
        body: {
          slug: 'proj-p',
          title: 'Proj',
          summary: 'Summary of the project',
          category: 'Full Stack',
          stage: 'LIVE',
          coverId: body.media.id,
        },
      }),
      ctx(),
    );
    const res = await mediaItemApi.PATCH(
      makeRequest(`/api/admin/media/${body.media.id}`, {
        method: 'PATCH',
        session: s,
        body: { alt: 'Cover', visibility: 'PUBLIC' },
      }),
      ctx({ id: body.media.id }),
    );
    expect(((await json(res)) as { managed: boolean }).managed).toBe(true);
    expect(
      (await prisma.mediaAsset.findUniqueOrThrow({ where: { id: body.media.id } })).visibility,
    ).toBe('PRIVATE');
  });
});

describe('certificate privacy workflow', () => {
  async function setup() {
    const s = await adminSession();
    const res = await achievementsApi.POST(
      makeRequest('/api/admin/achievements', {
        method: 'POST',
        session: s,
        body: { slug: 'cert', title: 'Certificate', category: 'OTHER', issuer: 'Issuer' },
      }),
      ctx(),
    );
    const { achievement } = (await json(res)) as { achievement: { id: string } };
    const original = (await upload(s, await pngBuffer(1400, 1000), 'original.png', 'image/png'))
      .body.media;
    await assetsApi.POST(
      makeRequest(`/api/admin/achievements/${achievement.id}/assets`, {
        method: 'POST',
        session: s,
        body: { mediaId: original.id, role: 'CERTIFICATE' },
      }),
      ctx({ id: achievement.id }),
    );
    return { s, id: achievement.id, original };
  }

  const put = (
    s: Awaited<ReturnType<typeof adminSession>>,
    id: string,
    patch: Record<string, unknown>,
  ) =>
    achievementApi.PUT(
      makeRequest(`/api/admin/achievements/${id}`, {
        method: 'PUT',
        session: s,
        body: { slug: 'cert', title: 'Certificate', category: 'OTHER', issuer: 'Issuer', ...patch },
      }),
      ctx({ id }),
    );

  it('crop creates a separate preview and never alters the original', async () => {
    const { s, id, original } = await setup();
    const res = await cropApi.POST(
      makeRequest(`/api/admin/achievements/${id}/crop`, {
        method: 'POST',
        session: s,
        body: { mediaId: original.id, x: 0, y: 0, width: 0.5, height: 0.5 },
      }),
      ctx({ id }),
    );
    expect(res.status).toBe(201);
    const { media } = (await json(res)) as { media: Media & { derivedFromId: string } };
    expect(media.derivedFromId).toBe(original.id);
    expect(media.width).toBe(700);
    const orig = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: original.id } });
    expect(orig.width).toBe(1400);
    const links = await prisma.achievementAsset.findMany({ where: { achievementId: id } });
    expect(links.map((l) => l.role).sort()).toEqual(['CERTIFICATE', 'PREVIEW']);
  });

  it('published certificates stay private until the preview is approved; originals until documentPublic', async () => {
    const { s, id, original } = await setup();
    const crop = await cropApi.POST(
      makeRequest(`/api/admin/achievements/${id}/crop`, {
        method: 'POST',
        session: s,
        body: { mediaId: original.id, x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
      }),
      ctx({ id }),
    );
    const preview = ((await json(crop)) as { media: Media }).media;

    await put(s, id, { status: 'PUBLISHED' });
    expect((await anon(preview.id)).status).toBe(404);
    expect((await anon(original.id)).status).toBe(404);

    await put(s, id, { status: 'PUBLISHED', previewApproved: true });
    expect((await anon(preview.id, '?v=display')).status).toBe(200);
    expect((await anon(original.id)).status).toBe(404);

    await put(s, id, { status: 'PUBLISHED', previewApproved: true, documentPublic: true });
    expect((await anon(original.id)).status).toBe(200);

    await put(s, id, { status: 'DRAFT', previewApproved: true, documentPublic: true });
    expect((await anon(preview.id)).status).toBe(404);
    expect((await anon(original.id)).status).toBe(404);
  });

  it('replace keeps role and alt text; detach keeps the file', async () => {
    const { s, id, original } = await setup();
    await prisma.mediaAsset.update({ where: { id: original.id }, data: { alt: 'Original alt' } });
    const replacement = (await upload(s, await pngBuffer(900, 600), 'new.png', 'image/png')).body
      .media;
    const link = await prisma.achievementAsset.findFirstOrThrow({
      where: { achievementId: id, role: 'CERTIFICATE' },
    });
    const res = await assetsApi.PUT(
      makeRequest(`/api/admin/achievements/${id}/assets`, {
        method: 'PUT',
        session: s,
        body: { assetId: link.id, mediaId: replacement.id },
      }),
      ctx({ id }),
    );
    expect(res.status).toBe(200);
    const updated = await prisma.achievementAsset.findUniqueOrThrow({
      where: { id: link.id },
      include: { media: true },
    });
    expect(updated.role).toBe('CERTIFICATE');
    expect(updated.media.id).toBe(replacement.id);
    expect(updated.media.alt).toBe('Original alt');

    const det = await assetsApi.DELETE(
      makeRequest(`/api/admin/achievements/${id}/assets?assetId=${link.id}`, {
        method: 'DELETE',
        session: s,
      }),
      ctx({ id }),
    );
    expect(det.status).toBe(200);
    expect(await prisma.mediaAsset.count({ where: { id: replacement.id } })).toBe(1);
  });

  it('refuses to delete media that is still in use unless forced', async () => {
    const { s, original } = await setup();
    const res = await mediaItemApi.DELETE(
      makeRequest(`/api/admin/media/${original.id}`, { method: 'DELETE', session: s }),
      ctx({ id: original.id }),
    );
    expect(res.status).toBe(409);
    const forced = await mediaItemApi.DELETE(
      makeRequest(`/api/admin/media/${original.id}?force=1`, { method: 'DELETE', session: s }),
      ctx({ id: original.id }),
    );
    expect(forced.status).toBe(200);
    expect(existsSync(path.resolve('storage-test/objects', original.key))).toBe(false);
  });
});
