import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { slugify } from '@/lib/utils';

type Tx = Prisma.TransactionClient | typeof prisma;

/** Upserts tags by name and returns their ids. */
export async function ensureTags(tx: Tx, names: string[]) {
  const ids: string[] = [];
  for (const name of names) {
    const slug = slugify(name);
    if (!slug) continue;
    const tag = await tx.tag.upsert({ where: { slug }, update: {}, create: { name, slug } });
    ids.push(tag.id);
  }
  return ids;
}

/** Upserts skills by name (group defaults to "Other") and returns their ids. */
export async function ensureSkills(tx: Tx, names: string[]) {
  const ids: string[] = [];
  for (const name of names) {
    const slug = slugify(name);
    if (!slug) continue;
    const existing = await tx.skill.findUnique({ where: { slug } });
    const skill = existing ?? (await tx.skill.create({ data: { name, slug, group: 'Other' } }));
    ids.push(skill.id);
  }
  return ids;
}

export async function audit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  meta?: Prisma.InputJsonValue,
) {
  await prisma.auditLog
    .create({ data: { userId, action, entityType, entityId: entityId ?? null, meta } })
    .catch((err) => console.error('[audit] failed', err));
}

/**
 * Invalidates cached public data. Safe to call outside a Next.js request
 * (scripts/tests), where it becomes a no-op.
 */
export function revalidate(tags: string[], paths: string[] = []) {
  for (const t of tags) {
    try {
      revalidateTag(t);
    } catch {
      /* outside Next runtime */
    }
  }
  for (const p of paths) {
    try {
      revalidatePath(p);
    } catch {
      /* outside Next runtime */
    }
  }
}

/** publishedAt is set the first time a record is published and kept afterwards. */
export function nextPublishedAt(
  status: string,
  current: Date | null | undefined,
  requested?: Date | null,
): Date | null {
  if (status !== 'PUBLISHED') return current ?? null;
  return requested ?? current ?? new Date();
}
