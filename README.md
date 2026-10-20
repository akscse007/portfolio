# AKASH ROY — DIGITAL LAB

> **I BUILD SYSTEMS. I STUDY PATTERNS.** — From mathematical foundations to intelligent software.

A full-stack personal portfolio, research archive, achievements and certificate gallery, video demo library, mathematics playground and educational blog, with a secure owner-only admin dashboard.

**Stack:** Next.js 15 (App Router, React 19, TypeScript strict) · Tailwind CSS · GSAP ScrollTrigger · Motion for React · PostgreSQL + Prisma · Argon2id sessions · KaTeX · highlight.js · Mermaid · sharp · pdf.js · S3-compatible storage · Vitest · Playwright.

---

## Contents

1. [Quick start](#quick-start)
2. [Commands](#commands)
3. [First admin & signing in](#first-admin--signing-in)
4. [Importing your certificates](#importing-your-certificates)
5. [What is in the box](#what-is-in-the-box)
6. [Content rules (privacy & authenticity)](#content-rules-privacy--authenticity)
7. [Project structure](#project-structure)
8. [Testing](#testing)
9. [ZIP packaging](#zip-packaging)
10. Further docs: [Deployment](docs/DEPLOYMENT.md) · [Storage & email](docs/STORAGE_AND_EMAIL.md) · [Security](docs/SECURITY.md) · [Troubleshooting](docs/TROUBLESHOOTING.md)

---

## Quick start

Requirements: **Node.js ≥ 20.18** (22 LTS recommended) and **PostgreSQL 14+**. Docker is optional: it starts Postgres and a local mail catcher.

### Windows PowerShell

```powershell
npm install
Copy-Item .env.example .env          # then edit DATABASE_URL / IP_HASH_SALT if needed
docker compose up -d                 # optional: Postgres on :5432 (+ test DBs) and Mailpit on :8025
npx prisma migrate deploy            # create tables
npm run db:seed                      # editable seed content (profile, projects, achievements, posts)
npm run admin:create -- --email you@example.com --name "Akash Roy"
npm run dev                          # http://localhost:3000  ·  admin: http://localhost:3000/admin/login
```

### macOS / Linux

```bash
npm install
cp .env.example .env
docker compose up -d
npx prisma migrate deploy
npm run db:seed
npm run admin:create -- --email you@example.com --name "Akash Roy"
npm run dev
```

No Docker? Install PostgreSQL yourself, create a database (`createdb digital_lab`) and point `DATABASE_URL` at it.

**Local preview with sample content:** seeded achievements and posts are **drafts** (private) by design. To see the public pages populated locally only, run `SEED_PUBLISH_SAMPLES=true npm run db:seed` (PowerShell: `$env:SEED_PUBLISH_SAMPLES='true'; npm run db:seed`). This is refused when `NODE_ENV=production`.

---

## Commands

| Task | Command |
| --- | --- |
| Install dependencies | `npm install` (also runs `prisma generate` and copies the pdf.js worker) |
| Start database (Docker) | `docker compose up -d` |
| Apply migrations | `npx prisma migrate deploy` (dev: `npm run db:migrate` to create new migrations) |
| Seed content | `npm run db:seed` (`SEED_OVERWRITE=true` re-applies seed text) |
| Create first admin | `npm run admin:create -- --email you@example.com --name "Your Name"` |
| Reset admin password | `npm run admin:reset-password -- --email you@example.com` |
| Import certificates | `npm run import:certificates -- "C:\path\to\Certificates"` |
| Development server | `npm run dev` |
| Lint / format / types | `npm run lint` · `npm run format:check` · `npm run typecheck` |
| Unit tests | `npm run test:unit` |
| Integration tests (real Postgres) | `npm run test:integration` |
| End-to-end tests | `npm run build` then `npm run test:e2e` |
| Read-only smoke test of a running server | `E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/smoke.spec.ts` (PowerShell: `$env:E2E_BASE_URL='http://localhost:3000'; npx playwright test e2e/smoke.spec.ts`) |
| Production build / start | `npm run build` · `npm run start` |
| Clean orphaned media | `npm run media:cleanup` (dry run) · `npm run media:cleanup -- --apply` |
| Create ZIP | `npm run zip` |
| Verify ZIP | `npm run zip:verify` |
| Prisma Studio | `npm run db:studio` |

---

## First admin & signing in

There are **no default credentials**. `npm run admin:create` prompts for the password with hidden input; set `ADMIN_PASSWORD` only for non-interactive environments. Rules:

- At least 12 characters, mixing three of: lowercase, uppercase, digits, symbols.
- Creating a second admin is refused unless you pass `--allow-additional`.
- Passwords are hashed with **Argon2id**. Sessions use random tokens; only their SHA-256 is stored.

Sign in at **`/admin/login`**. Sessions last `SESSION_TTL_HOURS` (default 12). Change your password under **Profile**, which signs out all other sessions. **Settings → Sign out everywhere** revokes every session.

---

## Importing your certificates

Certificate files are personal data, so they are **not** part of this repository or the ZIP. Import them locally:

```powershell
npm run import:certificates -- "C:\Users\you\Downloads\Certificates"
```

The importer:

- Recognises the documents. Coursera course and specialization PDFs are matched by the course name inside the PDF; it also recognises the NIELIT bootcamps, NextGenHack, the Outstanding Student Volunteer photo and the VECC internship certificate.
- Stores originals **privately** and creates **private** preview candidates (a PDF's first page is rendered to PNG).
- Fills only facts printed on the documents: issue dates, the Coursera verification links and their codes. Credential IDs and verification links stay **hidden** until you enable them.
- Leaves every record as a **DRAFT** with *Preview approved* **off**.
- For the VECC certificate, deliberately creates **no** preview because it shows a registration number. Use **Crop → preview** in the admin to publish a version without it.
- Is idempotent: re-running reuses identical files.

Then, in **Admin → Achievements**, open each record, check the preview, crop it if needed, turn on **Preview approved** and **Publish**. If a server-rendered PDF preview is missing text, click **Regenerate preview from PDF**, which renders it in your browser.

---

## What is in the box

**Public site**: `/` cinematic hero (canvas vector field and Lissajous with an SVG fallback, live Kolkata clock, optional availability badge) · pinned horizontal trajectory · pinned project storytelling · `/about` · `/work`, `/work/[slug]` · `/research` (animated NARX diagram) · `/achievements`, `/achievements/[slug]` · `/demos` · `/playground` · `/blog`, `/blog/[slug]`, `/topics/[slug]` · `/contact` · `/resume` (printable) · `/privacy` · `/terms` · 404 and error pages · RSS `/feed.xml` · Atom `/atom.xml` · `/sitemap.xml` · `/robots.txt` · generated Open Graph images.

**Achievements archive**: "PROOF OF WORK." landing page; counts computed from published records; featured "on the wall" exhibit; filters by category, issuer and year, plus search and sort, with shareable URLs and reset; a masonry document grid that never stretches certificates; a separate photographic treatment for award and event photos; a year timeline; and an accessible full-screen lightbox (zoom, fit, pan, pinch, swipe, ←/→, Esc, focus trap). PDFs open in the browser viewer, or full-screen on phones. Placeholders are clearly labelled and never imitate a certificate.

**Playground**: parametric curves, a function plotter (restricted parser, no `eval`), vector fields, gradient descent with momentum, 2×2 matrix transformations with eigenvectors, a tiny neural network trained live, and Fourier epicycles. All of them pause off-screen and respect reduced motion.

**Blog**: Markdown with GFM tables, KaTeX math, syntax highlighting with copy buttons, callouts, lazily-rendered Mermaid diagrams, a table of contents, reading progress, difficulty and reading time, series, topics, related posts, previous/next and share links. Eight original sample articles are seeded as **drafts**.

**Admin** (`/admin`): overview · projects (reorder, publish, gallery, cover) · achievements (search, filters, bulk publish/category/visibility, featured ordering, certificate/preview/photo/gallery assets, crop, replace, detach, PDF preview) · posts (split live preview, autosave, revisions and restore, image insertion, scheduling, slug validation) · draft previews · videos (YouTube/Vimeo/MP4, posters, VTT captions, transcripts) · media library (upload progress, alt text, usage, safe delete, orphan cleanup) · experience, education, skills, topics, series · profile and password · messages inbox · settings and audit log.

---

## Content rules (privacy & authenticity)

- Nothing is invented: no fake certificates, IDs, dates, links, metrics or testimonials. Seed records without documents show a labelled placeholder and stay unpublished.
- **Media visibility is derived from publication state.** Uploads are private. A file becomes public only while it is used by published content. Certificate previews additionally need *Preview approved*, and original documents need *Original document is public*. Unpublishing makes them private again.
- Private media returns **404**, never 403, so its existence is not revealed.
- Research summaries contain only details cleared for public disclosure.
- Narrative copy for the home-page trajectory lives in `src/content/trajectory.ts`. Everything else is editable in the admin.

---

## Project structure

```
prisma/              schema, migrations, seed + seed-data (content, sample articles)
scripts/             create-admin, import-certificates, cleanup-orphans, zip tools
src/app/(site)/      public routes          src/app/admin/   dashboard, login, previews
src/app/api/         route handlers (auth, contact, admin CRUD, uploads)
src/app/media/[id]   access-checked media delivery (local streaming or S3 signed URLs)
src/components/      hero, home, achievements, blog, playground, admin, ui, motion
src/lib/             auth, security, validation (zod), markdown, storage, email, seo, math parser
src/server/          repos/public.ts (public read model: published only, private fields removed)
                     services/* (business logic, media visibility, audit, revalidation)
tests/               unit + integration (Vitest)      e2e/   Playwright specs
docs/                deployment, storage & email, security, troubleshooting
```

Public pages are server-rendered on request. Data is cached with tags (`unstable_cache`) and invalidated by admin mutations, so builds never need a database.

---

## Testing

| Suite | Scope |
| --- | --- |
| `npm run test:unit` | validation, slug/URL rules, restricted math parser, file sniffing, redirects, passwords, markdown XSS sanitisation, JSON-LD/XML escaping, public DTO privacy |
| `npm run test:integration` | real PostgreSQL (`DATABASE_URL_TEST`, name must contain `test`): login/logout/rate-limit/CSRF, 401/403 on every admin API, publishing lifecycle, drafts never in listings/feeds/sitemap, scheduled posts, autosave and revisions, uploads (signatures, limits, variants), media access control, certificate approval workflow, crop/replace/detach, contact validation/honeypot/rate limits |
| `npm run test:e2e` | production build on :3100 with `DATABASE_URL_E2E` (name must contain `e2e`): home, security headers, 404s for drafts, sitemap/feeds, blog rendering, filters, playground parser, mobile menu, achievements filters and lightbox, admin login → write → publish → public, responsive overflow at 320/375/390/430/768/1024/1440 px, reduced motion, no-JS rendering |

CI (`.github/workflows/ci.yml`) runs lint, types, format, unit, integration, build and E2E against a Postgres service.

---

## ZIP packaging

```bash
npm run zip          # → dist/akash-roy-digital-lab.zip
npm run zip:verify   # checks required files, CRCs, and that no node_modules/.next/storage/.env/secrets/certificates are inside
```
