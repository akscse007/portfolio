import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { POST as changePassword } from '@/app/api/admin/account/password/route';
import { getSessionByToken, LOGIN_LIMITS, SESSION_COOKIE } from '@/lib/auth';
import {
  adminSession,
  createAdmin,
  ctx,
  json,
  makeRequest,
  resetDb,
  TEST_PASSWORD,
} from './helpers';

beforeEach(resetDb);

const loginReq = (email: string, password: string, origin?: string | null, ip = '198.51.100.7') =>
  makeRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    origin,
    headers: { 'x-forwarded-for': ip },
  });

describe('authentication', () => {
  it('logs in with valid credentials and sets an HttpOnly session cookie', async () => {
    await createAdmin();
    const res = await login(loginReq('owner@example.test', TEST_PASSWORD));
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`${SESSION_COOKIE}=`);
    expect(cookie.toLowerCase()).toContain('httponly');
    expect(cookie.toLowerCase()).toContain('samesite=lax');
    const token = cookie.split(';')[0]!.split('=')[1]!;
    const session = await getSessionByToken(token);
    expect(session?.user.email).toBe('owner@example.test');
    // only the hash of the token is stored
    expect(await prisma.session.count({ where: { id: token } })).toBe(0);
  });

  it('rejects a wrong password and unknown users with the same message', async () => {
    await createAdmin();
    const a = await login(loginReq('owner@example.test', 'wrong-password'));
    const b = await login(loginReq('nobody@example.test', 'wrong-password'));
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect((await json(a)).error).toBe((await json(b)).error);
  });

  it('rate-limits repeated failures per account', async () => {
    await createAdmin();
    let last: Response | null = null;
    for (let i = 0; i <= LOGIN_LIMITS.perAccount.limit; i++)
      last = await login(loginReq('owner@example.test', 'bad', undefined, `203.0.113.${i}`));
    expect(last!.status).toBe(429);
    expect(last!.headers.get('retry-after')).toBeTruthy();
    // even the right password is refused while locked
    expect(
      (await login(loginReq('owner@example.test', TEST_PASSWORD, undefined, '203.0.113.99')))
        .status,
    ).toBe(429);
  });

  it('rejects cross-origin login attempts (login CSRF)', async () => {
    await createAdmin();
    expect(
      (await login(loginReq('owner@example.test', TEST_PASSWORD, 'https://evil.example'))).status,
    ).toBe(403);
    expect((await login(loginReq('owner@example.test', TEST_PASSWORD, null))).status).toBe(403);
  });

  it('logout destroys the session', async () => {
    const s = await adminSession();
    const res = await logout(
      makeRequest('/api/auth/logout', { method: 'POST', session: s }),
      ctx(),
    );
    expect(res.status).toBe(200);
    expect(await getSessionByToken(s.token)).toBeNull();
  });

  it('expired sessions are rejected and removed', async () => {
    const s = await adminSession();
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await getSessionByToken(s.token)).toBeNull();
    expect(await prisma.session.count()).toBe(0);
  });

  it('password change validates strength and rotates all sessions', async () => {
    const s = await adminSession();
    const other = await adminSession();
    const weak = await changePassword(
      makeRequest('/api/admin/account/password', {
        method: 'POST',
        session: s,
        body: { currentPassword: TEST_PASSWORD, newPassword: 'weakweakweakweak' },
      }),
      ctx(),
    );
    expect(weak.status).toBe(400);
    const ok = await changePassword(
      makeRequest('/api/admin/account/password', {
        method: 'POST',
        session: s,
        body: { currentPassword: TEST_PASSWORD, newPassword: 'Brand-New-Passw0rd!' },
      }),
      ctx(),
    );
    expect(ok.status).toBe(200);
    expect(await getSessionByToken(other.token)).toBeNull();
    expect(await getSessionByToken(s.token)).toBeNull();
    expect(ok.headers.get('set-cookie')).toContain(SESSION_COOKIE);
  });
});
