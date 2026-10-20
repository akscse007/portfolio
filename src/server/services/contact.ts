import 'server-only';
import type { z } from 'zod';
import { prisma } from '@/lib/db';
import { HttpError } from '@/lib/api';
import type { contactSchema } from '@/lib/validation/schemas';
import { hitRateLimit } from '@/lib/security/rate-limit';
import { headerSafe, sendMail } from '@/lib/email';

export const CONTACT_LIMITS = { limit: 5, windowSeconds: 60 * 60 };
const MIN_FILL_MS = 2500;
const MAX_FORM_AGE_MS = 24 * 3600 * 1000;

const SPAM_PATTERNS = [
  /\b(viagra|casino|crypto\s*giveaway|seo\s*services|backlinks)\b/i,
  /(https?:\/\/\S+.*){4,}/i,
];

export type ContactOutcome = { id: string; emailSent: boolean };

/**
 * Accepts a contact submission. Throws HttpError for rejected submissions.
 * The message is persisted first; email delivery failure does not lose it.
 */
export async function submitContact(
  input: z.infer<typeof contactSchema>,
  meta: { ipHash: string; userAgent: string | null; now?: number },
): Promise<ContactOutcome> {
  const now = meta.now ?? Date.now();
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
    select: { contactEnabled: true },
  });
  if (settings && !settings.contactEnabled)
    throw new HttpError(503, 'The contact form is currently closed.');

  if (input.website) throw new HttpError(400, 'Submission rejected');
  const age = now - input.startedAt;
  if (age < MIN_FILL_MS)
    throw new HttpError(400, 'That was quick — please take a moment and try again.');
  if (age > MAX_FORM_AGE_MS)
    throw new HttpError(400, 'This form expired. Please reload the page and try again.');

  const rl = await hitRateLimit(
    `contact:${meta.ipHash}`,
    CONTACT_LIMITS.limit,
    CONTACT_LIMITS.windowSeconds,
  );
  if (!rl.allowed)
    throw new HttpError(
      429,
      `Too many messages. Please try again in about ${Math.ceil(rl.retryAfterSeconds / 60)} minutes.`,
    );

  const spam = SPAM_PATTERNS.some((p) => p.test(`${input.subject} ${input.message}`));

  const msg = await prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      subject: input.subject,
      body: input.message,
      status: spam ? 'SPAM' : 'NEW',
      ipHash: meta.ipHash,
      userAgent: meta.userAgent,
    },
  });

  let emailSent = false;
  if (!spam) {
    const to = process.env.CONTACT_TO;
    if (to) {
      const res = await sendMail({
        to,
        replyTo: input.email,
        subject: headerSafe(`[Digital Lab] ${input.subject}`),
        text: `New message from ${input.name} <${input.email}>\n\n${input.message}\n\n— Stored in the admin inbox (id ${msg.id}).`,
      });
      emailSent = res.sent;
      await prisma.contactMessage.update({
        where: { id: msg.id },
        data: { emailSent: res.sent, emailError: res.error ?? null },
      });
    }
  }
  return { id: msg.id, emailSent };
}
