import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { POST as contact } from '@/app/api/contact/route';
import { CONTACT_LIMITS } from '@/server/services/contact';
import { json, makeRequest, resetDb } from './helpers';

beforeEach(resetDb);

const valid = () => ({
  name: 'Riya Sen',
  email: 'riya@example.com',
  subject: 'Collaboration',
  message: 'Hello Akash, I would like to talk about a research collaboration.',
  website: '',
  startedAt: Date.now() - 10_000,
});

const send = (body: unknown, ip = '192.0.2.10', origin?: string | null) =>
  contact(
    makeRequest('/api/contact', {
      method: 'POST',
      body,
      origin,
      headers: { 'x-forwarded-for': ip },
    }),
  );

describe('contact form', () => {
  it('stores a valid message and returns 201 only after persistence', async () => {
    const res = await send(valid());
    expect(res.status).toBe(201);
    const { id } = (await json(res)) as { id: string };
    const row = await prisma.contactMessage.findUniqueOrThrow({ where: { id } });
    expect(row.status).toBe('NEW');
    expect(row.ipHash).toMatch(/^[a-f0-9]{32}$/);
    expect(row.ipHash).not.toContain('192.0.2.10');
  });

  it('validates input and returns field details', async () => {
    const res = await send({ ...valid(), email: 'not-an-email', message: 'short' });
    expect(res.status).toBe(400);
    const body = (await json(res)) as { details: { path: string }[] };
    expect(body.details.map((d) => d.path).sort()).toEqual(['email', 'message']);
    expect(await prisma.contactMessage.count()).toBe(0);
  });

  it('rejects honeypot and too-fast submissions', async () => {
    expect((await send({ ...valid(), website: 'https://spam.example' })).status).toBe(400);
    expect((await send({ ...valid(), startedAt: Date.now() })).status).toBe(400);
    expect(await prisma.contactMessage.count()).toBe(0);
  });

  it('rate-limits per client', async () => {
    for (let i = 0; i < CONTACT_LIMITS.limit; i++) expect((await send(valid())).status).toBe(201);
    expect((await send(valid())).status).toBe(429);
    expect((await send(valid(), '192.0.2.99')).status).toBe(201);
  });

  it('rejects cross-origin posts and respects the closed setting', async () => {
    expect((await send(valid(), '192.0.2.11', 'https://evil.example')).status).toBe(403);
    await prisma.siteSettings.create({
      data: {
        id: 'default',
        siteTitle: 'x',
        siteDescription: 'description',
        contactEnabled: false,
      },
    });
    expect((await send(valid(), '192.0.2.12')).status).toBe(503);
  });

  it('quietly files obvious spam without emailing', async () => {
    const res = await send({
      ...valid(),
      message: 'Cheap viagra and casino offers, visit now please friend.',
    });
    expect(res.status).toBe(201);
    const row = await prisma.contactMessage.findFirstOrThrow();
    expect(row.status).toBe('SPAM');
    expect(row.emailSent).toBe(false);
  });
});
