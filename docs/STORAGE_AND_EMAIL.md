# Storage and email configuration

## Media storage

All binary files live in a storage driver; PostgreSQL stores metadata only (`MediaAsset`: key, kind, MIME, size, dimensions, checksum, alt text, visibility, variants).

Every file is served through **`/media/:id`** (with `?v=thumb|display|original`, and `&download=1` to force a download). That route checks visibility on each request:

- `PUBLIC` → anyone. Responses are cacheable for 5 minutes.
- `PRIVATE` → only an authenticated admin, with `no-store`. Everyone else gets **404**.

Visibility is recomputed automatically whenever content is published, unpublished, approved or changed.

### Local (development)

```
STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=./storage
```
Files are written to `./storage/objects/YYYY/MM/<random>.<ext>`, outside `/public`, and are never committed or zipped. The local driver supports HTTP range requests, so videos can seek.

### S3-compatible (production)

```
STORAGE_DRIVER=s3
S3_BUCKET=digital-lab-media
S3_REGION=auto                      # R2: auto · AWS: e.g. ap-south-1
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com   # omit for AWS S3
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=false           # true for MinIO
S3_SIGNED_URL_TTL=300
MEDIA_ORIGIN=https://<account>.r2.cloudflarestorage.com  # added to the CSP
```

- **Keep the bucket private** (no public ACLs or policies). The app grants access per request: `/media/:id` issues a short-lived **signed URL** redirect after the visibility check.
- The access key needs `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` and `s3:ListBucket` on that bucket only.
- **MinIO locally:** `docker compose --profile s3 up -d`, create the bucket in the console at http://localhost:9001 (`minioadmin` / `minioadmin`), then set `S3_ENDPOINT=http://localhost:9000`, `S3_FORCE_PATH_STYLE=true` and `MEDIA_ORIGIN=http://localhost:9000`.

### Upload pipeline

1. Size limits by kind: `MAX_IMAGE_MB`, `MAX_PDF_MB`, `MAX_VIDEO_MB`; captions ≤ 2 MB.
2. Type detection from **file signatures**, not names or declared MIME types. Accepted: JPEG, PNG, WebP, GIF, AVIF, PDF, MP4, WebM and WebVTT. SVG and HTML are rejected.
3. Images are decoded with sharp. Dimensions are capped at 12,000 px and 80 MP to guard against decompression bombs. Re-encoded WebP variants (560 px and 1800 px) are generated, which strips EXIF and GPS metadata.
4. PDFs are checked for header and trailer. Captions are checked for script content.
5. Keys are random, server-generated `YYYY/MM/<24 chars>.<ext>`. User filenames are sanitised and stored only for display.
6. Responses send `X-Content-Type-Options: nosniff`, and non-PDF files are additionally served with `Content-Security-Policy: sandbox`.

Orphans: `npm run media:cleanup` lists files not used by any content (older than 24 h) and stray objects; `--apply` deletes them. The same scan is available in **Admin → Media → Maintenance**.

## Email

Contact messages are **always stored** in the admin inbox. Email is an optional notification.

| `EMAIL_PROVIDER` | Behaviour |
| --- | --- |
| `none` | never send |
| `console` | log the message to the server output (development default) |
| `smtp` | send with nodemailer through any SMTP server |

```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.resend.com     # or smtp.postmarkapp.com, email-smtp.<region>.amazonaws.com, smtp.gmail.com …
SMTP_PORT=587
SMTP_SECURE=false             # true for port 465
SMTP_USER=...
SMTP_PASSWORD=...
EMAIL_FROM="Digital Lab <no-reply@your-domain.example>"
CONTACT_TO=you@your-domain.example
```

- `EMAIL_FROM` must be a sender your provider has verified (SPF/DKIM on your domain).
- Delivery failures are recorded on the message (`emailError`) and shown in the inbox. The visitor still gets a success response, because the message was stored.
- **Mailpit locally:** `docker compose up -d`, then `SMTP_HOST=localhost`, `SMTP_PORT=1025`, no user or password. Read the mail at http://localhost:8025.
- Replies use the visitor's address as `Reply-To`. Subjects are stripped of CR/LF to prevent header injection.
