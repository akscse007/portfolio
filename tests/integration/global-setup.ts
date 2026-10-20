import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

/**
 * Integration tests run against a real PostgreSQL database (never the development DB).
 * DATABASE_URL_TEST defaults to postgresql://postgres:postgres@localhost:5432/digital_lab_test
 * (created by Docker Compose). Migrations are applied non-destructively; each test then
 * empties the tables of this dedicated test database (see helpers.resetDb).
 */
export default function setup() {
  const url =
    process.env.DATABASE_URL_TEST ||
    'postgresql://postgres:postgres@localhost:5432/digital_lab_test?schema=public';
  if (!/test/i.test(new URL(url).pathname))
    throw new Error(`Refusing to use a database whose name does not contain "test": ${url}`);
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
  rmSync('./storage-test', { recursive: true, force: true });
  return () => rmSync('./storage-test', { recursive: true, force: true });
}
