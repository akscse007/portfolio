import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { SESSION_COOKIE, getSessionByToken, type AdminSession } from '@/lib/auth';
import { safeEqual } from '@/lib/security/tokens';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Resource') => new HttpError(404, `${what} not found`);

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) },
  });
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return json({ error: err.message, details: err.details }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return json(
      {
        error: 'Validation failed',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      { status: 400 },
    );
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return json({ error: `A record with this ${target} already exists` }, { status: 409 });
    }
    if (err.code === 'P2025') return json({ error: 'Record not found' }, { status: 404 });
  }
  console.error('[api] unhandled error', err);
  return json({ error: 'Internal server error' }, { status: 500 });
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie-authenticated mutations:
 * 1) Origin (or Referer) must match this host, and
 * 2) the X-CSRF-Token header must equal the token bound to the session.
 */
export function assertCsrf(req: NextRequest, session: AdminSession) {
  if (SAFE_METHODS.has(req.method)) return;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const origin = req.headers.get('origin') ?? req.headers.get('referer');
  if (!origin || !host) throw new HttpError(403, 'Missing origin');
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, 'Invalid origin');
  }
  if (originHost !== host) throw new HttpError(403, 'Cross-origin request rejected');
  const token = req.headers.get('x-csrf-token');
  if (!token || !safeEqual(token, session.csrfToken))
    throw new HttpError(403, 'Invalid CSRF token');
}

export async function requireAdmin(req: NextRequest): Promise<AdminSession> {
  const session = await getSessionByToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) throw new HttpError(401, 'Authentication required');
  assertCsrf(req, session);
  return session;
}

type Ctx<P> = { params: Promise<P> };

/** Wraps an admin route handler with authentication, CSRF and error handling. */
export function adminRoute<P = Record<string, never>>(
  handler: (req: NextRequest, ctx: { session: AdminSession; params: P }) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      const session = await requireAdmin(req);
      const params = (await ctx?.params) ?? ({} as P);
      return await handler(req, { session, params });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function readJson(req: NextRequest, maxBytes = 1_000_000): Promise<unknown> {
  const len = Number(req.headers.get('content-length') || 0);
  if (len > maxBytes) throw new HttpError(413, 'Payload too large');
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, 'Payload too large');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Malformed JSON');
  }
}
