import { createHmac } from 'node:crypto';

type HeaderSource = { get(name: string): string | null };

/**
 * Best-effort client IP for rate limiting.
 * - TRUST_PROXY=true (behind Vercel, a load balancer or your own reverse proxy): the first
 *   X-Forwarded-For entry, i.e. the client address reported by the trusted proxy.
 * - otherwise: the last X-Forwarded-For entry, which is the hop closest to the Next.js server
 *   (added by `next start` from the socket address). Spoofed leading entries are ignored.
 */
export function clientIp(headers: HeaderSource): string {
  const trust = process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1';
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const pick = trust ? parts[0] : parts[parts.length - 1];
    if (pick) return pick.slice(0, 64);
  }
  if (trust) {
    const real = headers.get('x-real-ip');
    if (real) return real.trim().slice(0, 64);
  }
  return 'unknown';
}

export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || 'development-only-ip-salt';
  return createHmac('sha256', salt).update(ip).digest('hex').slice(0, 32);
}

export function userAgent(headers: HeaderSource): string | null {
  return headers.get('user-agent')?.slice(0, 300) ?? null;
}
