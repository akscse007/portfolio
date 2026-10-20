/**
 * E2E fixture data (runs against the dedicated e2e database only):
 *  - empties all tables, applies the regular seed
 *  - publishes three achievements with generated (clearly synthetic) images
 *  - keeps one achievement and one post as drafts to prove they stay private
 *  - creates the E2E admin
 */
import { execSync } from 'node:child_process';
import sharp from 'sharp';
import { prisma } from '../../src/lib/db';
import { hashPassword } from '../../src/lib/security/password';
import { ingestUpload, recomputeMediaVisibility } from '../../src/server/services/media';
import { E2E_ADMIN } from './credentials';

async function syntheticImage(label: string, w = 1400, h = 990) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#f3f1ea"/><rect x="30" y="30" width="${w - 60}" height="${h - 60}" fill="none" stroke="#0e0f0c" stroke-width="4" stroke-dasharray="12 10"/><text x="50%" y="50%" font-size="56" text-anchor="middle" font-family="sans-serif" fill="#0e0f0c">E2E FIXTURE — ${label}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  const db = new URL(process.env.DATABASE_URL!).pathname;
  if (!/e2e/i.test(db)) throw new Error('Not an e2e database');
  const tables = await prisma.$queryRaw<
    { tablename: string }[]
  >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );

  execSync('npx tsx prisma/seed.ts', {
    stdio: 'inherit',
    env: { ...process.env, SEED_PUBLISH_SAMPLES: 'true' },
  });

  const published = [
    'machine-learning-specialization',
    'nielit-big-data-data-science-bootcamp',
    'cuet-pg-mathematics-air-131',
  ];
  for (const slug of published) {
    const a = await prisma.achievement.findUniqueOrThrow({ where: { slug } });
    const img = await ingestUpload({
      buffer: await syntheticImage(slug),
      originalName: `${slug}.png`,
      alt: `Synthetic test preview for ${a.title}`,
    });
    await prisma.achievementAsset.create({
      data: { achievementId: a.id, mediaId: img.id, role: 'PREVIEW' },
    });
    await prisma.achievement.update({
      where: { id: a.id },
      data: { status: 'PUBLISHED', previewApproved: true, publishedAt: new Date() },
    });
    await recomputeMediaVisibility([img.id]);
  }
  // Keep one achievement private to verify drafts never leak.
  await prisma.achievement.update({
    where: { slug: 'hostel-general-secretary' },
    data: { status: 'DRAFT' },
  });
  await prisma.post.update({
    where: { slug: 'database-indexing-and-query-optimization' },
    data: { status: 'DRAFT' },
  });

  await prisma.user.create({
    data: {
      email: E2E_ADMIN.email,
      name: 'E2E Owner',
      passwordHash: await hashPassword(E2E_ADMIN.password),
    },
  });
  console.log('E2E database prepared.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
