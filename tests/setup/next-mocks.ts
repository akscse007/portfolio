import { vi } from 'vitest';

// Outside the Next.js runtime the data cache is unavailable: execute cached loaders directly
// and make revalidation a no-op so services and repositories can be tested in isolation.
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidateTag: () => undefined,
  revalidatePath: () => undefined,
}));
