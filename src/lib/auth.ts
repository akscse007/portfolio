import 'server-only';
import { cache } from 'react';
import { prisma } from '@/lib/db';
import { randomToken, sha256 } from '@/lib/security/tokens';
import { getDummyHash, verifyPassword } from '@/lib/security/password';
import { hitRateLimit, resetRateLimit } from '@/lib/security/rate-limit';

export const SESSION_COOKIE =
  process.env.NODE_ENV === 'production' ? '__Host-dl_session' : 'dl_session';

export type AdminSession = {
  sessionId: string;
  csrfToken: string;
  expiresAt: Date;
  user: { id: string; email: string; name: string; role: 'ADMIN' };
};

function ttlMs() {
  const hours = Number(process.env.SESSION_TTL_HOURS || 12);
  return (Number.isFinite(hours) && hours > 0 ? hours : 12) * 3600 * 1000;
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}

export async function createSession(
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
) {
  const token = randomToken(32);
  const csrfToken = randomToken(24);
  const expiresAt = new Date(Date.now() + ttlMs());
  await prisma.session.create({
    data: {
      id: sha256(token),
      userId,
      csrfToken,
      expiresAt,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });
  return { token, csrfToken, expiresAt };
}

export async function getSessionByToken(
  token: string | undefined | null,
): Promise<AdminSession | null> {
  if (!token || token.length < 20 || token.length > 128) return null;
  const id = sha256(token);
  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, name: true, role: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id } }).catch(() => undefined);
    return null;
  }
  // Touch at most every five minutes to avoid a write per request.
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await prisma.session
      .update({ where: { id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
  }
  return {
    sessionId: session.id,
    csrfToken: session.csrfToken,
    expiresAt: session.expiresAt,
    user: session.user,
  };
}

export async function destroySessionByToken(token: string | undefined | null) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { id: sha256(token) } });
}

export async function destroyAllSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

export const LOGIN_LIMITS = {
  perIp: { limit: 10, windowSeconds: 15 * 60 },
  perAccount: { limit: 5, windowSeconds: 15 * 60 },
};

export type LoginResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'invalid' | 'rate_limited'; retryAfterSeconds?: number };

/**
 * Verifies credentials with per-IP and per-account throttling.
 * Always performs a hash verification to reduce user-enumeration timing signals.
 */
export async function verifyLogin(
  email: string,
  password: string,
  ipKey: string,
): Promise<LoginResult> {
  const normalized = email.trim().toLowerCase();
  const [ipHit, acctHit] = await Promise.all([
    hitRateLimit(`login:ip:${ipKey}`, LOGIN_LIMITS.perIp.limit, LOGIN_LIMITS.perIp.windowSeconds),
    hitRateLimit(
      `login:acct:${sha256(normalized)}`,
      LOGIN_LIMITS.perAccount.limit,
      LOGIN_LIMITS.perAccount.windowSeconds,
    ),
  ]);
  if (!ipHit.allowed || !acctHit.allowed) {
    return {
      ok: false,
      reason: 'rate_limited',
      retryAfterSeconds: Math.max(ipHit.retryAfterSeconds, acctHit.retryAfterSeconds),
    };
  }

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    await verifyPassword(await getDummyHash(), password);
    return { ok: false, reason: 'invalid' };
  }
  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) return { ok: false, reason: 'invalid' };

  await resetRateLimit(`login:acct:${sha256(normalized)}`);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { ok: true, userId: user.id };
}

/** Server Components / layouts: resolve the current admin from the request cookies. */
export const getCurrentAdmin = cache(async (): Promise<AdminSession | null> => {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  return getSessionByToken(store.get(SESSION_COOKIE)?.value);
});
