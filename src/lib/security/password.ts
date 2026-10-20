import { hash, verify } from '@node-rs/argon2';

// Argon2id (library default) with OWASP-recommended minimum parameters.
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export const PASSWORD_MIN_LENGTH = 12;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Returns a list of problems; empty when the password is acceptable. */
export function passwordProblems(password: string, email?: string): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH)
    problems.push(`must be at least ${PASSWORD_MIN_LENGTH} characters`);
  if (password.length > 256) problems.push('must be at most 256 characters');
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) =>
    r.test(password),
  ).length;
  if (classes < 3)
    problems.push('must mix at least three of: lowercase, uppercase, digits, symbols');
  if (email && password.toLowerCase().includes(email.split('@')[0]!.toLowerCase()))
    problems.push('must not contain the email name');
  if (/^(.)\1+$/.test(password)) problems.push('must not be a single repeated character');
  return problems;
}

// A valid hash of a random string, used to equalise timing for unknown users.
let dummyHash: Promise<string> | null = null;
export function getDummyHash() {
  dummyHash ??= hashPassword(`dummy-${Math.random()}-${Date.now()}`);
  return dummyHash;
}
