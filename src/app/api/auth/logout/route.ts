import { adminRoute, json } from '@/lib/api';
import { destroyAllSessions, destroySessionByToken, SESSION_COOKIE } from '@/lib/auth';
import { audit } from '@/server/services/common';

export const POST = adminRoute(async (req, { session }) => {
  const everywhere = req.nextUrl.searchParams.get('all') === '1';
  if (everywhere) await destroyAllSessions(session.user.id);
  else await destroySessionByToken(req.cookies.get(SESSION_COOKIE)?.value);
  await audit(session.user.id, everywhere ? 'logout-all' : 'logout', 'user', session.user.id);
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
});
