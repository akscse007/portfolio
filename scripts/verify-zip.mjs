/**
 * Verifies dist/akash-roy-digital-lab.zip: required files present, forbidden files absent,
 * every entry's CRC valid, and no obvious secrets or private certificate data inside.
 *
 *   npm run zip:verify
 */
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const ZIP = process.argv[2] || 'dist/akash-roy-digital-lab.zip';
const buf = readFileSync(ZIP);

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC_TABLE[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

// Parse central directory
const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
if (eocd < 0) throw new Error('Not a ZIP file');
const count = buf.readUInt16LE(eocd + 10);
let p = buf.readUInt32LE(eocd + 16);
const entries = [];
for (let i = 0; i < count; i++) {
  const method = buf.readUInt16LE(p + 10);
  const crc = buf.readUInt32LE(p + 16);
  const csize = buf.readUInt32LE(p + 20);
  const nlen = buf.readUInt16LE(p + 28);
  const elen = buf.readUInt16LE(p + 30);
  const clen = buf.readUInt16LE(p + 32);
  const off = buf.readUInt32LE(p + 42);
  const name = buf.subarray(p + 46, p + 46 + nlen).toString('utf8');
  entries.push({ name, method, crc, csize, off });
  p += 46 + nlen + elen + clen;
}

const problems = [];
const names = entries.map((e) => e.name.replace(/^akash-roy-digital-lab\//, ''));

const REQUIRED = [
  'package.json',
  'package-lock.json',
  'README.md',
  '.env.example',
  '.gitignore',
  'docker-compose.yml',
  'Dockerfile',
  'prisma/schema.prisma',
  'prisma/seed.ts',
  'scripts/create-admin.ts',
  'scripts/import-certificates.ts',
  'src/app/(site)/page.tsx',
  'src/app/(site)/achievements/page.tsx',
  'src/app/(site)/achievements/[slug]/page.tsx',
  'src/app/admin/(dashboard)/achievements/AssetsManager.tsx',
  'src/app/admin/(dashboard)/posts/PostEditor.tsx',
  'src/app/media/[id]/route.ts',
  'src/middleware.ts',
  'src/components/ui/Lightbox.tsx',
  'docs/DEPLOYMENT.md',
  'docs/STORAGE_AND_EMAIL.md',
  'docs/TROUBLESHOOTING.md',
  'docs/SECURITY.md',
  'vitest.config.ts',
  'playwright.config.ts',
  '.github/workflows/ci.yml',
];
for (const r of REQUIRED) if (!names.includes(r)) problems.push(`missing required file: ${r}`);
if (!names.some((n) => n.startsWith('prisma/migrations/') && n.endsWith('migration.sql')))
  problems.push('missing database migration');
if (!names.some((n) => n.startsWith('tests/unit/'))) problems.push('missing unit tests');
if (!names.some((n) => n.startsWith('tests/integration/')))
  problems.push('missing integration tests');
if (!names.some((n) => n.startsWith('e2e/') && n.endsWith('.spec.ts')))
  problems.push('missing e2e tests');

const FORBIDDEN = [
  [/(^|\/)node_modules\//, 'node_modules'],
  [/(^|\/)\.next(-dev)?\//, '.next build output'],
  [/(^|\/)storage(-test|-e2e)?\//, 'local media storage'],
  [/(^|\/)\.env$/, 'real .env'],
  [/(^|\/)\.env\.(?!example$)/, 'environment file'],
  [/(^|\/)\.git\//, 'git metadata'],
  [/(^|\/)(playwright-report|test-results|coverage)\//, 'test artefacts'],
  [/\.(dump|sql\.gz|pem|key|p12|pfx)$/i, 'dump/secret file'],
  [
    /certificate.*\.(pdf|jpe?g|png)$|coursera.*\.pdf$|vecc.*\.(jpe?g|png)$/i,
    'certificate document',
  ],
];
for (const n of names)
  for (const [re, label] of FORBIDDEN) if (re.test(n)) problems.push(`forbidden (${label}): ${n}`);

// Integrity + content scan
const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key'],
  [/\b\d{3}-\d{4}-\d{4}-\d{2}\b/, 'university registration number'],
  [/coursera\.org\/verify\/(specialization\/)?[A-Z0-9]{10,}/, 'certificate verification code'],
  [/FSP\/[A-Z]+\/NIELIT\/[A-Z]+\/[A-Z0-9]+\/\d+\/\d+/, 'certificate code'],
  [/(\+91[\s-]?)?\b[6-9]\d{9}\b/, 'phone number'],
];
let bytes = 0;
for (const e of entries) {
  const nlen = buf.readUInt16LE(e.off + 26);
  const elen = buf.readUInt16LE(e.off + 28);
  const start = e.off + 30 + nlen + elen;
  const raw = buf.subarray(start, start + e.csize);
  const data = e.method === 8 ? inflateRawSync(raw) : raw;
  bytes += data.length;
  if (crc32(data) !== e.crc) problems.push(`CRC mismatch: ${e.name}`);
  if (
    /\.(ts|tsx|js|mjs|json|md|sql|yml|yaml|prisma|css|txt|example)$/.test(e.name) &&
    !e.name.endsWith('verify-zip.mjs') &&
    !e.name.endsWith('package-lock.json')
  ) {
    const text = data.toString('utf8');
    for (const [re, label] of SECRET_PATTERNS)
      if (re.test(text)) problems.push(`possible ${label} in ${e.name}`);
  }
}

console.log(
  `${ZIP}: ${entries.length} entries, ${(bytes / 1024 / 1024).toFixed(2)} MB uncompressed`,
);
if (problems.length) {
  console.error(`✖ ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(
  '✔ ZIP verified: required files present; no dependencies, build output, media, secrets or private certificate data.',
);
