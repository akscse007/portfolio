import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { prisma } from '@/lib/db';
import { createSession, SESSION_COOKIE } from '@/lib/auth';
import { hashPassword } from '@/lib/security/password';

export const ORIGIN = 'http://localhost:3000';
export const TEST_PASSWORD = 'Integration-Test-Passw0rd!';

/** Empties every application table (keeps the migrations table). */
export async function resetDb() {
  const dbName = new URL(process.env.DATABASE_URL ?? '').pathname;
  if (!/test/i.test(dbName))
    throw new Error(`resetDb refused: database "${dbName}" is not a test database`);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`,
    );
  }
}

export async function createAdmin(email = 'owner@example.test') {
  return prisma.user.create({
    data: { email, name: 'Owner', passwordHash: await hashPassword(TEST_PASSWORD) },
  });
}

export async function adminSession() {
  const user = (await prisma.user.findFirst()) ?? (await createAdmin());
  const s = await createSession(user.id);
  return { user, token: s.token, csrf: s.csrfToken, cookie: `${SESSION_COOKIE}=${s.token}` };
}

type Opts = {
  method?: string;
  body?: unknown;
  session?: { cookie: string; csrf: string } | null;
  csrf?: string | null;
  origin?: string | null;
  headers?: Record<string, string>;
  formData?: FormData;
};

export function makeRequest(path: string, opts: Opts = {}) {
  const headers: Record<string, string> = { host: 'localhost:3000', ...(opts.headers ?? {}) };
  if (opts.origin !== null) headers.origin = opts.origin ?? ORIGIN;
  if (opts.session) headers.cookie = opts.session.cookie;
  const csrf = opts.csrf === undefined ? opts.session?.csrf : opts.csrf;
  if (csrf) headers['x-csrf-token'] = csrf;
  let body: BodyInit | undefined;
  if (opts.formData) body = opts.formData;
  else if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  return new NextRequest(new URL(path, ORIGIN), { method: opts.method ?? 'GET', headers, body });
}

export const ctx = <P extends Record<string, string>>(params: P = {} as P) => ({
  params: Promise.resolve(params),
});

export async function json(res: Response) {
  return (await res.json()) as Record<string, unknown> & { error?: string };
}

export async function pngBuffer(width = 64, height = 48) {
  return sharp({ create: { width, height, channels: 3, background: { r: 198, g: 244, b: 50 } } })
    .png()
    .toBuffer();
}

export function minimalPdf() {
  return Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\nxref\n0 4\n0000000000 65535 f \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n0\n%%EOF\n',
    'latin1',
  );
}

export function fileForm(
  buffer: Buffer,
  name: string,
  type: string,
  extra: Record<string, string> = {},
) {
  const form = new FormData();
  form.append('file', new File([new Uint8Array(buffer)], name, { type }));
  for (const [k, v] of Object.entries(extra)) form.append(k, v);
  return form;
}
