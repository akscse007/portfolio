/**
 * Secure first-admin bootstrap (no default credentials exist).
 *
 *   npm run admin:create -- --email you@example.com --name "Akash Roy"
 *   npm run admin:reset-password -- --email you@example.com
 *
 * The password is read from a hidden interactive prompt, or from ADMIN_PASSWORD
 * for non-interactive environments (CI / containers). Creating a second admin is
 * refused unless --allow-additional is passed.
 */
import { PrismaClient } from '@prisma/client';
import readline from 'node:readline';
import { hashPassword, passwordProblems } from '../src/lib/security/password';

const prisma = new PrismaClient();

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error('No TTY available. Set ADMIN_PASSWORD for non-interactive use.'));
      return;
    }
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    const out = rl as unknown as {
      _writeToOutput: (s: string) => void;
      output: NodeJS.WriteStream;
    };
    let muted = false;
    out._writeToOutput = (s: string) => {
      if (!muted) out.output.write(s);
      else if (s.includes('\n')) out.output.write('\n');
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const reset = flag('reset');
  const email = (arg('email') ?? process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const name = arg('name') ?? process.env.ADMIN_NAME ?? 'Administrator';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Provide a valid --email (or ADMIN_EMAIL).');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (reset) {
    if (!existing) throw new Error(`No admin with email ${email}.`);
  } else {
    if (existing)
      throw new Error(
        `An admin with email ${email} already exists. Use admin:reset-password to change the password.`,
      );
    const count = await prisma.user.count();
    if (count > 0 && !flag('allow-additional'))
      throw new Error(
        'An administrator already exists. Pass --allow-additional to create another one deliberately.',
      );
  }

  let password = process.env.ADMIN_PASSWORD ?? '';
  if (!password) {
    password = await promptHidden('New admin password: ');
    const again = await promptHidden('Repeat password: ');
    if (password !== again) throw new Error('Passwords do not match.');
  }
  const problems = passwordProblems(password, email);
  if (problems.length) throw new Error(`Password ${problems.join('; ')}.`);

  const passwordHash = await hashPassword(password);
  if (reset) {
    await prisma.user.update({ where: { email }, data: { passwordHash } });
    await prisma.session.deleteMany({ where: { userId: existing!.id } });
    console.log(`Password updated for ${email}. All existing sessions were revoked.`);
  } else {
    const user = await prisma.user.create({ data: { email, name, passwordHash, role: 'ADMIN' } });
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'bootstrap', entityType: 'user', entityId: user.id },
    });
    console.log(`Admin created: ${email}. Sign in at /admin/login.`);
  }
}

main()
  .catch((err) => {
    console.error(`✖ ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
