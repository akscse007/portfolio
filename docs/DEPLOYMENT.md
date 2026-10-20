# Production deployment

The app is a standard Next.js 15 server. It needs **Node.js 20.18+**, **PostgreSQL**, and **S3-compatible object storage** for media. It supports any Node host (Vercel, Railway, Render, Fly.io, a VPS) or the included Dockerfile.

## 1. Provision

| Component | Options |
| --- | --- |
| PostgreSQL 14+ | Neon, Supabase, Railway, RDS, self-hosted |
| Object storage (private bucket) | Cloudflare R2, AWS S3, Backblaze B2, MinIO |
| SMTP (optional) | Resend, Postmark, SES, Mailgun, Brevo, Gmail SMTP |

## 2. Environment variables

Set at least:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?schema=public&sslmode=require
SITE_URL=https://your-domain.example
IP_HASH_SALT=<random 32+ chars>
STORAGE_DRIVER=s3
S3_BUCKET=... S3_REGION=... S3_ENDPOINT=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=...
MEDIA_ORIGIN=https://<bucket endpoint origin>        # lets the CSP allow signed media URLs
TRUST_PROXY=true                                       # behind Vercel / a load balancer
EMAIL_PROVIDER=smtp  SMTP_HOST=...  SMTP_USER=...  SMTP_PASSWORD=...  EMAIL_FROM=...  CONTACT_TO=...
```

See `.env.example` for every option. Never use `STORAGE_DRIVER=local` on serverless or ephemeral hosts, because uploads would be lost.

## 3. Database

```bash
npx prisma migrate deploy        # apply migrations (safe, non-destructive)
npm run db:seed                  # first deploy only: editable seed content (all achievements/posts as drafts)
npm run admin:create -- --email you@example.com --name "Akash Roy"
```

Run these from your machine against the production `DATABASE_URL`, or as a one-off job on the host.

## 4. Deploy

### Vercel
1. Import the repository. The framework is detected automatically.
2. Add the environment variables above (Production and Preview).
3. Set the build command to `npx prisma migrate deploy && npm run build`, or run migrations separately.
4. Media must use S3/R2: Vercel's filesystem is read-only and ephemeral.

### Docker (VPS, Fly.io, Railway, Render)
```bash
docker build -t digital-lab .
docker run -d --name digital-lab --env-file .env.production -p 3000:3000 digital-lab
```
The container runs `prisma migrate deploy` on start, then the standalone server. Put Nginx or Caddy in front for TLS and set `TRUST_PROXY=true`.

### Plain Node (VPS)
```bash
npm ci
npx prisma migrate deploy
npm run build
NODE_ENV=production npm run start      # behind a reverse proxy with TLS; use pm2/systemd to supervise
```

## 5. After deploying

- Visit `/admin/login`, sign in, review **Settings** and **Profile**, upload the CV PDF.
- Import certificates locally against production (with the production `.env`): `npm run import:certificates -- <folder>`. Then review, crop, approve and publish in the admin.
- Check `/sitemap.xml`, `/robots.txt`, `/feed.xml` and an Open Graph preview.
- Optional: `CSP_MODE=strict` enables per-request nonces with `strict-dynamic`.

## Backups

- Database: schedule `pg_dump` (or your provider's snapshots). Dumps are never committed.
- Media: enable bucket versioning or replication. The database stores only metadata and keys.

## Updating

```bash
git pull && npm ci && npx prisma migrate deploy && npm run build && restart
```
