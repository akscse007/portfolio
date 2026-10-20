import { prisma } from '@/lib/db';

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

/**
 * Atomic fixed-window counter stored in PostgreSQL so limits hold across
 * multiple server instances / serverless invocations.
 */
export async function hitRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const rows = await prisma.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart", "updatedAt")
    VALUES (${key}, 1, NOW(), NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."windowStart" < NOW() - make_interval(secs => ${windowSeconds}) THEN 1
        ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE
        WHEN "RateLimit"."windowStart" < NOW() - make_interval(secs => ${windowSeconds}) THEN NOW()
        ELSE "RateLimit"."windowStart" END,
      "updatedAt" = NOW()
    RETURNING "count", "windowStart"`;
  const row = rows[0]!;
  const elapsed = (Date.now() - new Date(row.windowStart).getTime()) / 1000;
  const retryAfterSeconds = Math.max(1, Math.ceil(windowSeconds - elapsed));
  return {
    allowed: row.count <= limit,
    remaining: Math.max(0, limit - row.count),
    retryAfterSeconds,
  };
}

export async function resetRateLimit(key: string) {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

/** Housekeeping: remove counters idle for more than a day. */
export async function pruneRateLimits() {
  await prisma.rateLimit.deleteMany({
    where: { updatedAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } },
  });
}
