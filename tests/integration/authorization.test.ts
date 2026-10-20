import { beforeEach, describe, expect, it } from 'vitest';
import type { NextRequest } from 'next/server';
import * as projects from '@/app/api/admin/projects/route';
import * as projectItem from '@/app/api/admin/projects/[id]/route';
import * as achievements from '@/app/api/admin/achievements/route';
import * as achievementItem from '@/app/api/admin/achievements/[id]/route';
import * as achievementAssets from '@/app/api/admin/achievements/[id]/assets/route';
import * as bulk from '@/app/api/admin/achievements/bulk/route';
import * as posts from '@/app/api/admin/posts/route';
import * as postItem from '@/app/api/admin/posts/[id]/route';
import * as autosave from '@/app/api/admin/posts/[id]/autosave/route';
import * as revisions from '@/app/api/admin/posts/[id]/revisions/route';
import * as preview from '@/app/api/admin/preview/route';
import * as videos from '@/app/api/admin/videos/route';
import * as media from '@/app/api/admin/media/route';
import * as mediaItem from '@/app/api/admin/media/[id]/route';
import * as orphans from '@/app/api/admin/media/orphans/route';
import * as collections from '@/app/api/admin/collections/[collection]/route';
import * as profile from '@/app/api/admin/profile/route';
import * as settings from '@/app/api/admin/settings/route';
import * as messages from '@/app/api/admin/messages/[id]/route';
import * as password from '@/app/api/admin/account/password/route';
import * as logout from '@/app/api/auth/logout/route';
import { adminSession, ctx, makeRequest, resetDb } from './helpers';

type Handler = (
  req: NextRequest,
  c: { params: Promise<Record<string, string>> },
) => Promise<Response>;
const ID = { id: 'clxxxxxxxxxxxxxxxxxxxxxxx' };

const routes: [string, string, Handler, Record<string, string>][] = [
  ['GET', '/api/admin/projects', projects.GET as Handler, {}],
  ['POST', '/api/admin/projects', projects.POST as Handler, {}],
  ['PUT', '/api/admin/projects/x', projectItem.PUT as Handler, ID],
  ['PATCH', '/api/admin/projects/x', projectItem.PATCH as Handler, ID],
  ['DELETE', '/api/admin/projects/x', projectItem.DELETE as Handler, ID],
  ['GET', '/api/admin/achievements', achievements.GET as Handler, {}],
  ['POST', '/api/admin/achievements', achievements.POST as Handler, {}],
  ['GET', '/api/admin/achievements/x', achievementItem.GET as Handler, ID],
  ['DELETE', '/api/admin/achievements/x', achievementItem.DELETE as Handler, ID],
  ['POST', '/api/admin/achievements/x/assets', achievementAssets.POST as Handler, ID],
  ['POST', '/api/admin/achievements/bulk', bulk.POST as Handler, {}],
  ['GET', '/api/admin/posts', posts.GET as Handler, {}],
  ['POST', '/api/admin/posts', posts.POST as Handler, {}],
  ['GET', '/api/admin/posts/x', postItem.GET as Handler, ID],
  ['POST', '/api/admin/posts/x/autosave', autosave.POST as Handler, ID],
  ['GET', '/api/admin/posts/x/revisions', revisions.GET as Handler, ID],
  ['POST', '/api/admin/preview', preview.POST as Handler, {}],
  ['GET', '/api/admin/videos', videos.GET as Handler, {}],
  ['GET', '/api/admin/media', media.GET as Handler, {}],
  ['POST', '/api/admin/media', media.POST as Handler, {}],
  ['PATCH', '/api/admin/media/x', mediaItem.PATCH as Handler, ID],
  ['DELETE', '/api/admin/media/x', mediaItem.DELETE as Handler, ID],
  ['POST', '/api/admin/media/orphans', orphans.POST as Handler, {}],
  ['POST', '/api/admin/collections/skills', collections.POST as Handler, { collection: 'skills' }],
  ['PUT', '/api/admin/profile', profile.PUT as Handler, {}],
  ['PUT', '/api/admin/settings', settings.PUT as Handler, {}],
  ['PATCH', '/api/admin/messages/x', messages.PATCH as Handler, ID],
  ['POST', '/api/admin/account/password', password.POST as Handler, {}],
  ['POST', '/api/auth/logout', logout.POST as Handler, {}],
];

beforeEach(resetDb);

describe('server-side authorization on every admin API', () => {
  it.each(routes)('%s %s → 401 without a session', async (method, path, handler, params) => {
    const res = await handler(
      makeRequest(path, { method, body: method === 'GET' ? undefined : {} }),
      ctx(params),
    );
    expect(res.status).toBe(401);
  });

  it.each(routes.filter((r) => r[0] !== 'GET'))(
    '%s %s → 403 without a CSRF token',
    async (method, path, handler, params) => {
      const s = await adminSession();
      const res = await handler(
        makeRequest(path, { method, body: {}, session: s, csrf: null }),
        ctx(params),
      );
      expect(res.status).toBe(403);
    },
  );

  it('rejects a forged CSRF token and cross-origin mutations', async () => {
    const s = await adminSession();
    const forged = await projects.POST(
      makeRequest('/api/admin/projects', {
        method: 'POST',
        body: {},
        session: s,
        csrf: 'forged-token',
      }),
      ctx(),
    );
    expect(forged.status).toBe(403);
    const cross = await projects.POST(
      makeRequest('/api/admin/projects', {
        method: 'POST',
        body: {},
        session: s,
        origin: 'https://evil.example',
      }),
      ctx(),
    );
    expect(cross.status).toBe(403);
  });

  it('allows authenticated reads and validates authenticated writes', async () => {
    const s = await adminSession();
    expect(
      (await projects.GET(makeRequest('/api/admin/projects', { session: s }), ctx())).status,
    ).toBe(200);
    const invalid = await projects.POST(
      makeRequest('/api/admin/projects', {
        method: 'POST',
        body: { slug: 'Bad Slug' },
        session: s,
      }),
      ctx(),
    );
    expect(invalid.status).toBe(400);
  });

  it('rejects unknown collections', async () => {
    const s = await adminSession();
    const res = await collections.POST(
      makeRequest('/api/admin/collections/users', { method: 'POST', body: {}, session: s }),
      ctx({ collection: 'users' }),
    );
    expect(res.status).toBe(404);
  });
});
