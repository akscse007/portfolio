# Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Something diverged" with `Cannot find module './vendor-chunks/…'` (dev) | A production build overwrote the dev server's output. Dev now uses its own folder (`.next-dev`); restart `npm run dev` once. In development the error screen shows the real message; the server terminal logs a JSON `request_error` entry with the same reference. |
| Error screen after client navigation on wide screens (`removeChild` in the console) | Fixed: GSAP scenes now set up and revert in layout effects and the pinned section has a React-owned wrapper. If you add new pinned scenes, use `useGsapEffect` from `src/components/motion/gsap.ts`. |
| `Environment variable not found: DATABASE_URL` | Copy `.env.example` to `.env` and set `DATABASE_URL`. |
| `Can't reach database server at localhost:5432` | Start Postgres (`docker compose up -d`) or fix host and port. On Windows, check that nothing else uses port 5432. |
| `Database "digital_lab_test" does not exist` | The Docker init script creates the test DBs only on first start. Run `docker compose exec postgres createdb -U postgres digital_lab_test` (and `digital_lab_e2e`), or `docker compose down -v` and start again. |
| `character ... has no equivalent in encoding "WIN1252"` | Your Postgres database was created with a Windows code page. Recreate it as UTF-8: `CREATE DATABASE digital_lab ENCODING 'UTF8' TEMPLATE template0;` |
| Public pages are empty | Seeded achievements and posts are drafts by design. Publish them in `/admin`, or use `SEED_PUBLISH_SAMPLES=true npm run db:seed` locally. |
| `/admin` keeps redirecting to login | Create an admin (`npm run admin:create`). In production over plain HTTP the `__Host-` cookie cannot be set; use HTTPS. Clear cookies after changing `NODE_ENV`. |
| "Too many attempts" on login | Wait 15 minutes, or clear the rows: `DELETE FROM "RateLimit" WHERE key LIKE 'login:%';` |
| Forgot admin password | `npm run admin:reset-password -- --email you@example.com` |
| Upload fails with 415 | The file's real content isn't an allowed type (e.g. an SVG renamed to .png, or a HEIC photo). Convert to JPEG/PNG/WebP/PDF/MP4. |
| Upload fails with 413 | Raise `MAX_IMAGE_MB` / `MAX_PDF_MB` / `MAX_VIDEO_MB`. Reverse proxies may need `client_max_body_size` raised too. |
| Images 404 in production | Private media is hidden until the content using it is published (and, for certificates, approved). With S3, check credentials and set `MEDIA_ORIGIN` so the CSP allows the signed URLs. |
| `sharp` / `@node-rs/argon2` install errors | Use Node 20.18+ or 22 on a supported platform (prebuilt binaries for Windows x64, macOS and Linux x64/arm64). Delete `node_modules` and run `npm install` again. |
| PDF preview missing text after import | Server-side pdf.js rendering can miss some fonts and effects. In the achievement editor click **Regenerate preview from PDF**, which renders it in your browser. |
| Mermaid diagram shows only source | Mermaid loads lazily on the client. Check the browser console for syntax errors; the text source stays readable in "Diagram source". |
| Changes don't appear on the public site | Admin saves revalidate cached data immediately. If you edited the DB by hand, wait up to 5 minutes or restart the server. |
| `prisma migrate dev` wants to reset the DB | Your local DB drifted from the migrations. Back up first. In development, `npm run db:reset` recreates it (destroys data). |
| Playwright: `Executable doesn't exist` | Run `npx playwright install chromium`. |
| E2E tests can't connect | Set `DATABASE_URL_E2E` (database name must contain `e2e`) and run `npm run build` first. |
| Windows: `'cp' is not recognized` | Use PowerShell `Copy-Item .env.example .env`. |
| Port 3000 in use | `npm run dev -- -p 3001` (update `SITE_URL`). |
