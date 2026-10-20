import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

/** Prepares the dedicated E2E database: migrations, seed, published fixtures and a test admin. */
export default function globalSetup() {
  const url =
    process.env.DATABASE_URL_E2E ||
    'postgresql://postgres:postgres@localhost:5432/digital_lab_e2e?schema=public';
  if (!/e2e/i.test(new URL(url).pathname))
    throw new Error(`Refusing to prepare a database whose name does not contain "e2e": ${url}`);
  const env = {
    ...process.env,
    DATABASE_URL: url,
    LOCAL_STORAGE_DIR: './storage-e2e',
    STORAGE_DRIVER: 'local',
  };
  rmSync('./storage-e2e', { recursive: true, force: true });
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env });
  execSync('npx tsx --conditions=react-server e2e/fixtures/prepare-db.ts', {
    stdio: 'inherit',
    env,
  });
}
