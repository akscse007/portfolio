/**
 * Imports the owner's certificate files into PRIVATE storage and links them to
 * achievement records — without publishing anything.
 *
 *   npm run import:certificates -- "C:\path\to\Certificates"
 *   npm run import:certificates -- ./my-certificates --dry-run
 *
 * What it does
 *  - Detects each document (filename + text inside PDFs) and maps it to an achievement.
 *  - Stores the original privately (MediaAsset visibility PRIVATE) and creates a private
 *    preview image (PDF first page rendered with pdf.js, or a copy of the image).
 *  - Fills only facts printed on the document (issue date, verification link, credential code);
 *    credential IDs and verification links stay HIDDEN until you enable them in /admin.
 *  - Leaves every record as DRAFT with "preview approved" OFF. Review, crop out personal
 *    identifiers (e.g. registration numbers) and publish from the admin dashboard.
 *  - Idempotent: identical files (same SHA-256) are reused, never duplicated.
 *
 * Certificate files are personal data: they are never committed to the repository or the ZIP.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient, type AchievementCategory } from '@prisma/client';
import { createHash } from 'node:crypto';
import { ingestUpload, recomputeMediaVisibility } from '../src/server/services/media';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

type Target = {
  slug: string;
  create?: {
    title: string;
    category: AchievementCategory;
    issuer: string;
    summary: string;
    dateLabel?: string;
    skillsCovered?: string[];
  };
  role: 'CERTIFICATE' | 'PHOTO';
  issueDate?: Date | null;
  verificationUrl?: string | null;
  credentialId?: string | null;
  autoPreview: boolean;
  warning?: string;
  alt: string;
};

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function parseEnglishDate(text: string): Date | null {
  const m = text.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),\s*(20\d{2})/i,
  );
  if (!m) return null;
  return new Date(Date.UTC(Number(m[3]), MONTHS[m[1]!.slice(0, 3).toLowerCase()]!, Number(m[2])));
}

function parseDotDate(text: string): Date | null {
  const m = text.match(/Date of Issue:\s*(\d{2})\.(\d{2})\.(\d{4})/i);
  return m ? new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]))) : null;
}

async function pdfText(buf: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buf),
    isEvalSupported: false,
    useSystemFonts: false,
  }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  const text = content.items.map((i) => ('str' in i ? i.str : '')).join(' ');
  await doc.destroy();
  // Some generators insert spaces inside words ("Ver ify"); keep a squashed copy too.
  return `${text} || ${text.replace(/\s+/g, '')}`;
}

/** Renders page 1 of a PDF to PNG using pdf.js + @napi-rs/canvas. Returns null if unavailable. */
async function pdfToPng(buf: Buffer): Promise<Buffer | null> {
  try {
    const { createCanvas } = await import('@napi-rs/canvas');
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    class CanvasFactory {
      create(w: number, h: number) {
        const canvas = createCanvas(w, h);
        return { canvas, context: canvas.getContext('2d') };
      }
      reset(cc: { canvas: { width: number; height: number } }, w: number, h: number) {
        cc.canvas.width = w;
        cc.canvas.height = h;
      }
      destroy(cc: { canvas: { width: number; height: number } }) {
        cc.canvas.width = 0;
        cc.canvas.height = 0;
      }
    }
    const pdfRoot = path.join(process.cwd(), 'node_modules', 'pdfjs-dist');
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buf),
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
      standardFontDataUrl: path.join(pdfRoot, 'standard_fonts').split(path.sep).join('/') + '/',
      cMapUrl: path.join(pdfRoot, 'cmaps').split(path.sep).join('/') + '/',
      cMapPacked: true,
      CanvasFactory: CanvasFactory as never,
    } as never).promise;
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(3, 2000 / base.width) });
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas: canvas as never, canvasContext: ctx as never, viewport }).promise;
    await doc.destroy();
    return canvas.toBuffer('image/png');
  } catch (err) {
    console.warn(
      `  ! PDF preview rendering failed (${err instanceof Error ? err.message : err}). Upload a preview in /admin instead.`,
    );
    return null;
  }
}

function classify(file: string, text: string): Target | null {
  const name = path.basename(file).toLowerCase();
  const squashed = text.replace(/\s+/g, '').toLowerCase();

  if (name.startsWith('coursera')) {
    const date = parseEnglishDate(text);
    const spec =
      text.match(/coursera\.org\/verify\/specialization\/([A-Z0-9]{8,16})/i) ??
      squashed.match(/coursera\.org\/verify\/specialization\/([a-z0-9]{8,16})/i);
    const course =
      text.match(/coursera\.org\/verify\/([A-Z0-9]{8,16})/i) ??
      squashed.match(/coursera\.org\/verify\/([a-z0-9]{8,16})/i);
    if (/specialization/i.test(text) && /machinelearning/.test(squashed) && spec) {
      const code = spec[1]!.toUpperCase();
      return {
        slug: 'machine-learning-specialization',
        role: 'CERTIFICATE',
        issueDate: date,
        credentialId: code,
        verificationUrl: `https://coursera.org/verify/specialization/${code}`,
        autoPreview: true,
        alt: 'Machine Learning Specialization certificate — Stanford Online and DeepLearning.AI, via Coursera',
      };
    }
    const courses: { match: string; slug: string; title: string; skills: string[] }[] = [
      {
        match: 'supervisedmachinelearning',
        slug: 'supervised-machine-learning-regression-and-classification',
        title: 'Supervised Machine Learning: Regression and Classification',
        skills: ['Linear regression', 'Logistic regression', 'Gradient descent'],
      },
      {
        match: 'advancedlearningalgorithms',
        slug: 'advanced-learning-algorithms',
        title: 'Advanced Learning Algorithms',
        skills: ['Neural networks', 'Decision trees', 'Model evaluation'],
      },
      {
        match: 'unsupervisedlearning',
        slug: 'unsupervised-learning-recommenders-reinforcement-learning',
        title: 'Unsupervised Learning, Recommenders, Reinforcement Learning',
        skills: [
          'Clustering',
          'Anomaly detection',
          'Recommender systems',
          'Reinforcement learning',
        ],
      },
    ];
    const c = courses.find((x) => squashed.includes(x.match));
    if (c && course) {
      const code = course[1]!.toUpperCase();
      return {
        slug: c.slug,
        create: {
          title: c.title,
          category: 'COURSE_SPECIALIZATION',
          issuer: 'DeepLearning.AI & Stanford Online (Coursera)',
          summary: `Course in the Machine Learning Specialization by DeepLearning.AI and Stanford Online, offered through Coursera.`,
          dateLabel: date ? String(date.getUTCFullYear()) : undefined,
          skillsCovered: c.skills,
        },
        role: 'CERTIFICATE',
        issueDate: date,
        credentialId: code,
        verificationUrl: `https://coursera.org/verify/${code}`,
        autoPreview: true,
        alt: `${c.title} — course certificate, DeepLearning.AI and Stanford Online via Coursera`,
      };
    }
    return null;
  }

  if (name.includes('big data')) {
    return {
      slug: 'nielit-big-data-data-science-bootcamp',
      role: 'CERTIFICATE',
      issueDate: parseDotDate(text),
      autoPreview: true,
      warning: 'Contains a certificate code and signatures — review before approving the preview.',
      alt: 'Certificate of completion — Bootcamp on Big Data & Data Science, NIELIT Kolkata',
    };
  }
  if (name.includes('blockchain')) {
    return {
      slug: 'nielit-blockchain-bootcamp',
      create: {
        title: 'Bootcamp on Blockchain',
        category: 'WORKSHOP_TRAINING',
        issuer: 'NIELIT Kolkata',
        summary:
          'Bootcamp on Blockchain conducted by NIELIT Kolkata as part of the FutureSkills PRIME programme.',
        dateLabel: '2024',
        skillsCovered: ['Blockchain'],
      },
      role: 'CERTIFICATE',
      issueDate: parseDotDate(text),
      autoPreview: true,
      warning: 'Contains a certificate code and signatures — review before approving the preview.',
      alt: 'Certificate of completion — Bootcamp on Blockchain, NIELIT Kolkata',
    };
  }
  if (name.includes('nextgenhack')) {
    return {
      slug: 'nextgenhack-reflexons-2026',
      create: {
        title: 'NextGenHack — Reflexons 2026 (Participation)',
        category: 'HACKATHON_COMPETITION',
        issuer: 'Department of Computer Science & Engineering, University of Calcutta',
        summary:
          'Certificate of participation in NextGenHack at Reflexons 2026, organised by the Department of Computer Science & Engineering, University of Calcutta.',
        dateLabel: '2026',
      },
      role: 'CERTIFICATE',
      autoPreview: true,
      alt: 'Certificate of participation — NextGenHack, Reflexons 2026, University of Calcutta',
    };
  }
  if (name.includes('volunteer')) {
    return {
      slug: 'outstanding-student-volunteer-award',
      role: 'PHOTO',
      autoPreview: false,
      warning:
        'Award photograph includes other people — confirm you may publish it before approving.',
      alt: 'Akash Roy receiving the Outstanding Student Volunteer Award plaque (2025–2026) at the University of Calcutta',
    };
  }
  if (name.includes('vecc')) {
    return {
      slug: 'vecc-research-internship',
      role: 'CERTIFICATE',
      autoPreview: false,
      warning:
        'Shows a university registration number and signatures. No preview was created: crop a public preview that excludes the registration number in /admin before approving.',
      alt: 'Certificate of internship — Variable Energy Cyclotron Centre, Department of Atomic Energy',
    };
  }
  return null;
}

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(full)));
    else if (/\.(pdf|png|jpe?g|webp)$/i.test(e.name)) out.push(full);
  }
  return out;
}

async function ingestOnce(
  buffer: Buffer,
  originalName: string,
  alt: string,
  derivedFromId?: string,
) {
  const checksum = createHash('sha256').update(buffer).digest('hex');
  const existing = await prisma.mediaAsset.findFirst({ where: { checksum } });
  if (existing) return { media: existing, reused: true };
  const media = await ingestUpload({
    buffer,
    originalName,
    alt,
    visibility: 'PRIVATE',
    derivedFromId: derivedFromId ?? null,
  });
  return { media, reused: false };
}

async function main() {
  const dir = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!dir) throw new Error('Usage: npm run import:certificates -- <folder> [--dry-run]');
  if (!(await stat(dir)).isDirectory()) throw new Error(`${dir} is not a folder`);
  const files = await listFiles(dir);
  console.log(`Found ${files.length} document(s) in ${dir}${dryRun ? ' (dry run)' : ''}\n`);

  for (const file of files) {
    const buffer = await readFile(file);
    const isPdf = /\.pdf$/i.test(file);
    const text = isPdf ? await pdfText(buffer).catch(() => '') : '';
    const target = classify(file, text);
    const label = path.basename(file);
    if (!target) {
      console.log(`- ${label}: not recognised — upload it manually in /admin/achievements`);
      continue;
    }
    console.log(`- ${label} → ${target.slug} (${target.role.toLowerCase()})`);
    if (target.warning) console.log(`  ⚠ ${target.warning}`);
    if (dryRun) continue;

    let achievement = await prisma.achievement.findUnique({ where: { slug: target.slug } });
    if (!achievement) {
      if (!target.create) {
        console.log('  ! Matching seed record not found — run `npm run db:seed` first. Skipped.');
        continue;
      }
      achievement = await prisma.achievement.create({
        data: {
          slug: target.slug,
          ...target.create,
          skillsCovered: target.create.skillsCovered ?? [],
          status: 'DRAFT',
        },
      });
      console.log('  + created draft record');
    }

    // Facts printed on the document; never overwrite owner edits, never make them public.
    await prisma.achievement.update({
      where: { id: achievement.id },
      data: {
        issueDate: achievement.issueDate ?? target.issueDate ?? null,
        credentialId: achievement.credentialId ?? target.credentialId ?? null,
        verificationUrl: achievement.verificationUrl ?? target.verificationUrl ?? null,
      },
    });

    const original = await ingestOnce(buffer, label, target.alt);
    console.log(
      `  ${original.reused ? '= reused' : '+ stored'} original (private) ${original.media.id}`,
    );
    const linked = await prisma.achievementAsset.findFirst({
      where: { achievementId: achievement.id, mediaId: original.media.id },
    });
    if (!linked) {
      if (target.role === 'CERTIFICATE')
        await prisma.achievementAsset.deleteMany({
          where: { achievementId: achievement.id, role: 'CERTIFICATE' },
        });
      await prisma.achievementAsset.create({
        data: { achievementId: achievement.id, mediaId: original.media.id, role: target.role },
      });
    }

    if (target.autoPreview) {
      const hasPreview = await prisma.achievementAsset.count({
        where: { achievementId: achievement.id, role: 'PREVIEW' },
      });
      if (!hasPreview) {
        let previewId: string | null = null;
        if (isPdf) {
          const png = await pdfToPng(buffer);
          if (png)
            previewId = (
              await ingestOnce(
                png,
                label.replace(/\.[^.]+$/, '') + '-preview.png',
                target.alt,
                original.media.id,
              )
            ).media.id;
        } else {
          // Re-encoded copy of the image; the original stays untouched and private.
          previewId = (
            await ingestUpload({
              buffer,
              originalName: 'preview-' + label,
              alt: target.alt,
              visibility: 'PRIVATE',
              derivedFromId: original.media.id,
            })
          ).id;
        }
        if (previewId) {
          await prisma.achievementAsset.create({
            data: { achievementId: achievement.id, mediaId: previewId, role: 'PREVIEW' },
          });
          console.log('  + private preview candidate created (approve it in /admin)');
          if (isPdf)
            console.log(
              '    i Server-side PDF rendering can miss some fonts/effects. If text is missing, use “Regenerate preview from PDF” in /admin (renders in your browser).',
            );
        }
      }
    }
    const ids = (
      await prisma.achievementAsset.findMany({
        where: { achievementId: achievement.id },
        select: { mediaId: true },
      })
    ).map((a) => a.mediaId);
    await recomputeMediaVisibility(ids);
  }

  console.log('\nDone. Everything imported is PRIVATE and every record is still a DRAFT.');
  console.log(
    'Next: /admin/achievements → review each record, crop previews, approve, then publish.',
  );
}

main()
  .catch((err) => {
    console.error(`✖ ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
