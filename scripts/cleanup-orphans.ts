/**
 * Lists (default) or deletes (--apply) media files that are not referenced by any content
 * and are older than 24 hours, plus storage objects with no database record.
 *
 *   npm run media:cleanup            # dry run
 *   npm run media:cleanup -- --apply
 */
import { PrismaClient } from '@prisma/client';
import { LocalStorage } from '../src/lib/storage/local';
import { S3Storage } from '../src/lib/storage/s3';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const store =
  process.env.STORAGE_DRIVER === 's3'
    ? new S3Storage({
        bucket: process.env.S3_BUCKET!,
        region: process.env.S3_REGION,
        endpoint: process.env.S3_ENDPOINT || undefined,
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
        signedUrlTtl: 300,
      })
    : new LocalStorage(process.env.LOCAL_STORAGE_DIR || './storage');

async function referenced(id: string) {
  const checks = await Promise.all([
    prisma.projectMedia.count({ where: { mediaId: id } }),
    prisma.project.count({ where: { coverId: id } }),
    prisma.achievementAsset.count({ where: { mediaId: id } }),
    prisma.post.count({
      where: { OR: [{ coverId: id }, { content: { contains: `/media/${id}` } }] },
    }),
    prisma.video.count({ where: { OR: [{ posterId: id }, { fileId: id }, { captionsId: id }] } }),
    prisma.profile.count({ where: { OR: [{ cvMediaId: id }, { portraitMediaId: id }] } }),
    prisma.siteSettings.count({ where: { defaultOgMediaId: id } }),
    prisma.mediaAsset.count({ where: { derivedFromId: id } }),
  ]);
  return checks.some((n) => n > 0);
}

async function main() {
  const rows = await prisma.mediaAsset.findMany();
  const known = new Set<string>();
  for (const r of rows) {
    known.add(r.key);
    for (const k of Object.values((r.variants ?? {}) as Record<string, string>)) known.add(k);
  }
  const objects = await store.list();
  const stray = objects.filter((k) => !known.has(k));
  const cutoff = Date.now() - 24 * 3600 * 1000;
  const unused = [];
  for (const r of rows)
    if (r.createdAt.getTime() < cutoff && !(await referenced(r.id))) unused.push(r);

  console.log(`Stray storage objects: ${stray.length}`);
  stray.forEach((k) => console.log(`  - ${k}`));
  console.log(`Unreferenced media records (>24h): ${unused.length}`);
  unused.forEach((r) => console.log(`  - ${r.id} ${r.originalName}`));

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to delete.');
    return;
  }
  for (const k of stray) await store.delete(k);
  for (const r of unused) {
    await prisma.mediaAsset.delete({ where: { id: r.id } });
    for (const k of [r.key, ...Object.values((r.variants ?? {}) as Record<string, string>)])
      await store.delete(k).catch(() => undefined);
  }
  console.log('Deleted.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
