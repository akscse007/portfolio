# Security model

| Area | Implementation |
| --- | --- |
| Admin accounts | No default credentials. CLI bootstrap with a hidden prompt, password-strength policy and refusal to create extra admins silently. Argon2id hashing (19 MiB, t=2). |
| Sessions | 256-bit random token in an HttpOnly, SameSite=Lax cookie (`__Host-` prefixed and Secure in production). Only the SHA-256 is stored. Absolute expiry; logout, logout-everywhere and rotation on password change. |
| CSRF | Every cookie-authenticated mutation requires a matching `Origin`/`Referer` host **and** an `X-CSRF-Token` bound to the session. Login and contact forms also reject cross-origin posts. |
| Authorization | `adminRoute()` wraps every admin API with session lookup, CSRF check and error mapping. Dashboard layouts and previews re-check the session server-side; middleware is only a fast redirect. |
| Rate limiting | PostgreSQL fixed windows (works across instances): login 10 per IP and 5 per account per 15 min, contact 5 per hour per IP hash, uploads 300 per hour. |
| Input validation | zod schemas on every endpoint. Slugs, `http(s)`-only URLs, length caps, enums. Unknown fields are stripped. JSON bodies are size-capped. |
| XSS | Markdown is rendered server-side with raw HTML **dropped**, then `rehype-sanitize` (GitHub schema, `http/https/mailto` links only), and only then KaTeX and highlighting. React escapes everything else. JSON-LD output is `<`/`>`/`&`-escaped. |
| CSP | Set by middleware: `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'self'`, `base-uri 'self'`, `form-action 'self'`, frames limited to youtube-nocookie and Vimeo. `CSP_MODE=strict` switches scripts to per-request nonces with `strict-dynamic`. Also sends nosniff, Referrer-Policy, Permissions-Policy, COOP, X-Frame-Options, and HSTS in production. |
| Uploads | Magic-byte detection, kind allow-lists, size and pixel limits, re-encoded image variants (no EXIF), random server keys, path-traversal-proof storage resolution, no execution, sandboxed delivery. |
| Media privacy | Visibility derived from publication state; private media returns 404; certificate previews need explicit approval; originals need `documentPublic`. |
| Drafts | One public read model (`src/server/repos/public.ts`) filters `status = PUBLISHED` (and `publishedAt ≤ now` for posts) and strips private fields. Sitemap, feeds and OG images use it too. |
| SQL injection | Prisma parameterised queries. The single raw query (rate limiter) uses tagged-template parameters. |
| SSRF | The server never fetches user-supplied URLs. Video URLs are parsed to IDs only. |
| Open redirects | Post-login `next` accepts only same-site `/admin…` paths. |
| Privacy | Visitor IPs are stored only as HMAC hashes (`IP_HASH_SALT`). No analytics or third-party cookies. Third-party players load only after a click. |
| Audit | `AuditLog` records logins, failed logins, uploads and every content mutation. Recent entries appear in Settings. |
| Secrets | All configuration is in env vars. Nothing secret is exposed to client bundles (no `NEXT_PUBLIC_*` secrets). `.env` and media are excluded from git and the ZIP. |

**Reporting:** please email the address on the contact page rather than opening a public issue.

**Known limits:** if the server is reachable directly while `TRUST_PROXY=false`, per-IP limits rely on the closest `X-Forwarded-For` hop; per-account login limits still apply. Large video uploads are buffered in memory by the route handler, so very large media is better uploaded through the storage provider's console.
