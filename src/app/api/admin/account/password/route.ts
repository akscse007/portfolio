import { adminRoute, HttpError, json, readJson } from '@/lib/api';
import { passwordChangeSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db';
import { hashPassword, passwordProblems, verifyPassword } from '@/lib/security/password';
import {
  createSession,
  sessionCookieOptions,
  SESSION_COOKIE,
  destroyAllSessions,
} from '@/lib/auth';
import { audit } from '@/server/services/common';

export const POST = adminRoute(async (req, { session }) => {
  const { currentPassword, newPassword } = passwordChangeSchema.parse(await readJson(req));
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!(await verifyPassword(user.passwordHash, currentPassword)))
    throw new HttpError(400, 'Current password is incorrect');
  const problems = passwordProblems(newPassword, user.email);
  if (problems.length) throw new HttpError(400, `New password ${problems.join('; ')}`);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  // Rotate: end every session, then start a fresh one for this browser.
  await destroyAllSessions(user.id);
  const fresh = await createSession(user.id);
  await audit(user.id, 'password-change', 'user', user.id);
  const res = json({ ok: true, csrfToken: fresh.csrfToken });
  res.cookies.set(SESSION_COOKIE, fresh.token, sessionCookieOptions(fresh.expiresAt));
  return res;
});
