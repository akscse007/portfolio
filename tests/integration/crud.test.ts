import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import * as achievementsApi from '@/app/api/admin/achievements/route';
import * as bulkApi from '@/app/api/admin/achievements/bulk/route';
import * as videosApi from '@/app/api/admin/videos/route';
import * as collectionApi from '@/app/api/admin/collections/[collection]/route';
import * as collectionItemApi from '@/app/api/admin/collections/[collection]/[id]/route';
import * as profileApi from '@/app/api/admin/profile/route';
import * as messagesApi from '@/app/api/admin/messages/[id]/route';
import * as previewApi from '@/app/api/admin/preview/route';
import { getCv, getProfile, getVideos } from '@/server/repos/public';
import { adminSession, ctx, json, makeRequest, resetDb } from './helpers';

beforeEach(resetDb);

describe('admin CRUD', () => {
  it('bulk-updates and reorders achievements', async () => {
    const s = await adminSession();
    const ids: string[] = [];
    for (const slug of ['a-one', 'a-two', 'a-three']) {
      const res = await achievementsApi.POST(
        makeRequest('/api/admin/achievements', {
          method: 'POST',
          session: s,
          body: { slug, title: slug, category: 'OTHER', issuer: 'Issuer' },
        }),
        ctx(),
      );
      ids.push(((await json(res)) as { achievement: { id: string } }).achievement.id);
    }
    const bulk = await bulkApi.POST(
      makeRequest('/api/admin/achievements/bulk', {
        method: 'POST',
        session: s,
        body: { ids: ids.slice(0, 2), patch: { status: 'PUBLISHED', category: 'AWARD_HONOUR' } },
      }),
      ctx(),
    );
    expect(((await json(bulk)) as { count: number }).count).toBe(2);
    expect(
      await prisma.achievement.count({ where: { status: 'PUBLISHED', category: 'AWARD_HONOUR' } }),
    ).toBe(2);
    expect(
      (await prisma.achievement.findFirstOrThrow({ where: { slug: 'a-one' } })).publishedAt,
    ).not.toBeNull();

    await bulkApi.PUT(
      makeRequest('/api/admin/achievements/bulk', {
        method: 'PUT',
        session: s,
        body: { ids: [...ids].reverse() },
      }),
      ctx(),
    );
    const ordered = await prisma.achievement.findMany({ orderBy: { order: 'asc' } });
    expect(ordered.map((a) => a.slug)).toEqual(['a-three', 'a-two', 'a-one']);

    const empty = await bulkApi.POST(
      makeRequest('/api/admin/achievements/bulk', {
        method: 'POST',
        session: s,
        body: { ids, patch: {} },
      }),
      ctx(),
    );
    expect(empty.status).toBe(400);
  });

  it('creates videos from provider URLs and stores only the id', async () => {
    const s = await adminSession();
    const res = await videosApi.POST(
      makeRequest('/api/admin/videos', {
        method: 'POST',
        session: s,
        body: {
          slug: 'demo',
          title: 'Demo',
          provider: 'YOUTUBE',
          externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          status: 'PUBLISHED',
        },
      }),
      ctx(),
    );
    expect(res.status).toBe(201);
    const v = await prisma.video.findFirstOrThrow();
    expect(v.externalId).toBe('dQw4w9WgXcQ');
    expect((await getVideos())[0]!.externalId).toBe('dQw4w9WgXcQ');
  });

  it('manages experience entries through collections', async () => {
    const s = await adminSession();
    const res = await collectionApi.POST(
      makeRequest('/api/admin/collections/experience', {
        method: 'POST',
        session: s,
        body: {
          organization: 'Org',
          role: 'Engineer',
          kind: 'WORK',
          period: '2026',
          highlights: ['Did a thing, carefully'],
        },
      }),
      ctx({ collection: 'experience' }),
    );
    expect(res.status).toBe(201);
    const { item } = (await json(res)) as { item: { id: string } };
    expect((await getCv()).experience[0]!.highlights).toEqual(['Did a thing, carefully']);
    await collectionItemApi.PUT(
      makeRequest(`/api/admin/collections/experience/${item.id}`, {
        method: 'PUT',
        session: s,
        body: {
          organization: 'Org',
          role: 'Engineer',
          kind: 'WORK',
          period: '2026',
          visible: false,
        },
      }),
      ctx({ collection: 'experience', id: item.id }),
    );
    expect((await getCv()).experience).toHaveLength(0);
    await collectionItemApi.DELETE(
      makeRequest(`/api/admin/collections/experience/${item.id}`, { method: 'DELETE', session: s }),
      ctx({ collection: 'experience', id: item.id }),
    );
    expect(await prisma.experience.count()).toBe(0);
  });

  it('saves the profile; availability is shown only when enabled with a label', async () => {
    const s = await adminSession();
    const body = {
      name: 'Akash Roy',
      headline: 'AI Engineer',
      tagline: 'I build systems.',
      subTagline: 'From maths to software.',
      location: 'Kolkata, India',
      timezone: 'Asia/Kolkata',
      shortBio: 'Bio',
      bio: 'Long bio',
      researchInterests: ['Time series'],
      email: 'a@example.com',
      githubUrl: 'https://github.com/example',
      availabilityOn: false,
      availabilityLabel: 'Open to work',
    };
    expect(
      (
        await profileApi.PUT(
          makeRequest('/api/admin/profile', { method: 'PUT', session: s, body }),
          ctx(),
        )
      ).status,
    ).toBe(200);
    expect((await getProfile())!.availability).toBeNull();
    await profileApi.PUT(
      makeRequest('/api/admin/profile', {
        method: 'PUT',
        session: s,
        body: { ...body, availabilityOn: true },
      }),
      ctx(),
    );
    expect((await getProfile())!.availability).toBe('Open to work');
    const bad = await profileApi.PUT(
      makeRequest('/api/admin/profile', {
        method: 'PUT',
        session: s,
        body: { ...body, githubUrl: 'javascript:alert(1)' },
      }),
      ctx(),
    );
    expect(bad.status).toBe(400);
  });

  it('updates and deletes contact messages', async () => {
    const s = await adminSession();
    const m = await prisma.contactMessage.create({
      data: { name: 'A', email: 'a@b.co', subject: 'Hi', body: 'Hello there friend' },
    });
    await messagesApi.PATCH(
      makeRequest(`/api/admin/messages/${m.id}`, {
        method: 'PATCH',
        session: s,
        body: { status: 'ARCHIVED' },
      }),
      ctx({ id: m.id }),
    );
    expect((await prisma.contactMessage.findUniqueOrThrow({ where: { id: m.id } })).status).toBe(
      'ARCHIVED',
    );
    await messagesApi.DELETE(
      makeRequest(`/api/admin/messages/${m.id}`, { method: 'DELETE', session: s }),
      ctx({ id: m.id }),
    );
    expect(await prisma.contactMessage.count()).toBe(0);
  });

  it('preview endpoint uses the sanitising renderer', async () => {
    const s = await adminSession();
    const res = await previewApi.POST(
      makeRequest('/api/admin/preview', {
        method: 'POST',
        session: s,
        body: { content: '# Hi\n\n<script>alert(1)</script>\n\nInline $x^2$' },
      }),
      ctx(),
    );
    const body = (await json(res)) as { html: string };
    expect(body.html).not.toContain('<script');
    expect(body.html).toContain('katex');
  });

  it('writes an audit trail for mutations', async () => {
    const s = await adminSession();
    await achievementsApi.POST(
      makeRequest('/api/admin/achievements', {
        method: 'POST',
        session: s,
        body: { slug: 'x-1', title: 'Xx', category: 'OTHER', issuer: 'Issuer' },
      }),
      ctx(),
    );
    expect(
      await prisma.auditLog.count({ where: { entityType: 'achievement', action: 'create' } }),
    ).toBe(1);
  });
});
