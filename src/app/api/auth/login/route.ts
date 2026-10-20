import type { NextRequest } from 'next/server';
import { createSession, sessionCookieOptions, SESSION_COOKIE, verifyLogin } from '@/lib/auth';
import { errorResponse, HttpError, json, readJson } from '@/lib/api';
import { loginSchema } from '@/lib/validation/schemas';
import { clientIp, hashIp, userAgent } from '@/lib/security/request';
import { safeAdminRedirect } from '@/lib/security/redirect';
import { audit } from '@/server/services/common';

export async function POST(req: NextRequest) {
  try {
    // Login CSRF defence: only accept same-origin submissions.
    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    if (!origin || !host || new URL(origin).host !== host)
      throw new HttpError(403, 'Cross-origin login rejected');

    const { email, password, next } = loginSchema.parse(await readJson(req, 10_000));
    const ip = clientIp(req.headers);
    const result = await verifyLogin(email, password, hashIp(ip));
    if (!result.ok) {
      if (result.reason === 'rate_limited') {
        return json(
          {
            error: `Too many attempts. Try again in ${Math.ceil((result.retryAfterSeconds ?? 60) / 60)} minute(s).`,
          },
          { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds ?? 60) } },
        );
      }
      await audit(null, 'login-failed', 'user', null, { email });
      return json({ error: 'Invalid email or password' }, { status: 401 });
    }
    const session = await createSession(result.userId, {
      ip: hashIp(ip),
      userAgent: userAgent(req.headers),
    });
    await audit(result.userId, 'login', 'user', result.userId);
    const res = json({ ok: true, redirect: safeAdminRedirect(next) });
    res.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
