import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import * as projectsApi from '@/app/api/admin/projects/route';
import * as projectApi from '@/app/api/admin/projects/[id]/route';
import * as postsApi from '@/app/api/admin/posts/route';
import * as postApi from '@/app/api/admin/posts/[id]/route';
import * as autosaveApi from '@/app/api/admin/posts/[id]/autosave/route';
import * as revisionsApi from '@/app/api/admin/posts/[id]/revisions/route';
import * as achievementsApi from '@/app/api/admin/achievements/route';
import * as achievementApi from '@/app/api/admin/achievements/[id]/route';
import {
  getAchievement,
  getAchievements,
  getPost,
  getPosts,
  getProject,
  getProjects,
  getSitemapEntries,
} from '@/server/repos/public';
import { buildAtom, buildRss } from '@/lib/feed';
import { adminSession, ctx, json, makeRequest, resetDb } from './helpers';

beforeEach(resetDb);

const project = {
  slug: 'demo-project',
  title: 'Demo Project',
  summary: 'A project used in integration tests.',
  category: 'Full Stack',
  stage: 'LIVE',
};

describe('project publishing lifecycle', () => {
  it('drafts are invisible; publishing exposes; unpublishing hides again', async () => {
    const s = await adminSession();
    const created = await projectsApi.POST(
      makeRequest('/api/admin/projects', { method: 'POST', session: s, body: project }),
      ctx(),
    );
    expect(created.status).toBe(201);
    const { project: p } = (await json(created)) as { project: { id: string; status: string } };
    expect(p.status).toBe('DRAFT');
    expect(await getProjects()).toHaveLength(0);
    expect(await getProject('demo-project')).toBeNull();

    await projectApi.PATCH(
      makeRequest(`/api/admin/projects/${p.id}`, {
        method: 'PATCH',
        session: s,
        body: { status: 'PUBLISHED' },
      }),
      ctx({ id: p.id }),
    );
    expect((await getProjects()).map((x) => x.slug)).toEqual(['demo-project']);
    const row = await prisma.project.findUniqueOrThrow({ where: { id: p.id } });
    expect(row.publishedAt).not.toBeNull();

    await projectApi.PATCH(
      makeRequest(`/api/admin/projects/${p.id}`, {
        method: 'PATCH',
        session: s,
        body: { status: 'ARCHIVED' },
      }),
      ctx({ id: p.id }),
    );
    expect(await getProject('demo-project')).toBeNull();
  });

  it('enforces unique slugs with a 409', async () => {
    const s = await adminSession();
    await projectsApi.POST(
      makeRequest('/api/admin/projects', { method: 'POST', session: s, body: project }),
      ctx(),
    );
    const dup = await projectsApi.POST(
      makeRequest('/api/admin/projects', { method: 'POST', session: s, body: project }),
      ctx(),
    );
    expect(dup.status).toBe(409);
  });

  it('updates and deletes', async () => {
    const s = await adminSession();
    const { project: p } = (await json(
      await projectsApi.POST(
        makeRequest('/api/admin/projects', { method: 'POST', session: s, body: project }),
        ctx(),
      ),
    )) as {
      project: { id: string };
    };
    const upd = await projectApi.PUT(
      makeRequest(`/api/admin/projects/${p.id}`, {
        method: 'PUT',
        session: s,
        body: { ...project, title: 'Renamed', skills: ['TypeScript'], tags: ['web'] },
      }),
      ctx({ id: p.id }),
    );
    expect(upd.status).toBe(200);
    const row = await prisma.project.findUniqueOrThrow({
      where: { id: p.id },
      include: { skills: { include: { skill: true } } },
    });
    expect(row.title).toBe('Renamed');
    expect(row.skills.map((x) => x.skill.name)).toEqual(['TypeScript']);
    expect(
      (
        await projectApi.DELETE(
          makeRequest(`/api/admin/projects/${p.id}`, { method: 'DELETE', session: s }),
          ctx({ id: p.id }),
        )
      ).status,
    ).toBe(200);
    expect(await prisma.project.count()).toBe(0);
  });
});

describe('blog drafts never leak', () => {
  async function createPost(
    s: Awaited<ReturnType<typeof adminSession>>,
    extra: Record<string, unknown> = {},
  ) {
    const res = await postsApi.POST(
      makeRequest('/api/admin/posts', {
        method: 'POST',
        session: s,
        body: {
          slug: 'secret-draft',
          title: 'Secret Draft',
          content: '## Hidden\n\nDraft body',
          ...extra,
        },
      }),
      ctx(),
    );
    expect(res.status).toBe(201);
    return ((await json(res)) as { post: { id: string } }).post.id;
  }

  it('drafts are absent from listings, detail, feeds and the sitemap', async () => {
    const s = await adminSession();
    await createPost(s);
    expect(await getPosts()).toHaveLength(0);
    expect(await getPost('secret-draft')).toBeNull();
    expect(await buildRss()).not.toContain('secret-draft');
    expect(await buildAtom()).not.toContain('Secret Draft');
    expect((await getSitemapEntries()).posts).toHaveLength(0);
  });

  it('scheduled posts stay hidden until their publish date', async () => {
    const s = await adminSession();
    await createPost(s, {
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(await getPost('secret-draft')).toBeNull();
    await prisma.post.updateMany({ data: { publishedAt: new Date(Date.now() - 1000) } });
    expect(await getPost('secret-draft')).not.toBeNull();
  });

  it('autosave edits drafts in place but stores revisions for published posts', async () => {
    const s = await adminSession();
    const id = await createPost(s);
    const r1 = await autosaveApi.POST(
      makeRequest(`/api/admin/posts/${id}/autosave`, {
        method: 'POST',
        session: s,
        body: { title: 'Secret Draft', excerpt: '', content: 'v2' },
      }),
      ctx({ id }),
    );
    expect(((await json(r1)) as { mode: string }).mode).toBe('draft');
    expect((await prisma.post.findUniqueOrThrow({ where: { id } })).content).toBe('v2');

    await postApi.PATCH(
      makeRequest(`/api/admin/posts/${id}`, {
        method: 'PATCH',
        session: s,
        body: { status: 'PUBLISHED' },
      }),
      ctx({ id }),
    );
    const r2 = await autosaveApi.POST(
      makeRequest(`/api/admin/posts/${id}/autosave`, {
        method: 'POST',
        session: s,
        body: { title: 'Secret Draft', excerpt: '', content: 'half-written' },
      }),
      ctx({ id }),
    );
    expect(((await json(r2)) as { mode: string }).mode).toBe('revision');
    expect((await prisma.post.findUniqueOrThrow({ where: { id } })).content).toBe('v2'); // live content unchanged
    expect((await getPost('secret-draft'))?.content).toBe('v2');

    const list = (await json(
      await revisionsApi.GET(
        makeRequest(`/api/admin/posts/${id}/revisions`, { session: s }),
        ctx({ id }),
      ),
    )) as {
      revisions: { id: string; reason: string }[];
    };
    const auto = list.revisions.find((r) => r.reason === 'autosave')!;
    const restored = await revisionsApi.POST(
      makeRequest(`/api/admin/posts/${id}/revisions`, {
        method: 'POST',
        session: s,
        body: { revisionId: auto.id },
      }),
      ctx({ id }),
    );
    expect(restored.status).toBe(200);
    expect((await prisma.post.findUniqueOrThrow({ where: { id } })).content).toBe('half-written');
  });
});

describe('achievement privacy', () => {
  const base = {
    slug: 'ml-spec',
    title: 'Machine Learning Specialization',
    category: 'COURSE_SPECIALIZATION',
    issuer: 'Stanford Online & DeepLearning.AI',
    credentialId: 'PRIVATE-CODE-123',
    verificationUrl: 'https://coursera.org/verify/specialization/PRIVATE-CODE-123',
  };

  it('unpublished achievements are not public and private fields stay hidden after publishing', async () => {
    const s = await adminSession();
    const res = await achievementsApi.POST(
      makeRequest('/api/admin/achievements', { method: 'POST', session: s, body: base }),
      ctx(),
    );
    const { achievement } = (await json(res)) as { achievement: { id: string } };
    expect(await getAchievements()).toHaveLength(0);
    expect(await getAchievement('ml-spec')).toBeNull();

    await achievementApi.PATCH(
      makeRequest(`/api/admin/achievements/${achievement.id}`, {
        method: 'PATCH',
        session: s,
        body: { status: 'PUBLISHED' },
      }),
      ctx({ id: achievement.id }),
    );
    const pub = await getAchievement('ml-spec');
    expect(pub).not.toBeNull();
    expect(pub!.credentialId).toBeNull();
    expect(pub!.verificationUrl).toBeNull();
    expect(JSON.stringify(await getAchievements())).not.toContain('PRIVATE-CODE-123');

    await achievementApi.PUT(
      makeRequest(`/api/admin/achievements/${achievement.id}`, {
        method: 'PUT',
        session: s,
        body: { ...base, status: 'PUBLISHED', showVerification: true },
      }),
      ctx({ id: achievement.id }),
    );
    expect((await getAchievement('ml-spec'))!.verificationUrl).toContain('coursera.org');
    expect((await getAchievement('ml-spec'))!.credentialId).toBeNull();
  });
});
