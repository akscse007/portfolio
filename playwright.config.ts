import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against a production build (`npm run build` first) served on port 3100,
 * using a dedicated database (DATABASE_URL_E2E, name must contain "e2e").
 */
const PORT = Number(process.env.E2E_PORT || 3100);
/**
 * E2E_BASE_URL=http://localhost:3000 runs only the read-only smoke specs (@smoke) against an
 * already-running server (e.g. your dev server), without starting a server or touching any database.
 */
const EXTERNAL = process.env.E2E_BASE_URL;
const BASE = EXTERNAL || `http://localhost:${PORT}`;
const E2E_DB =
  process.env.DATABASE_URL_E2E ||
  'postgresql://postgres:postgres@localhost:5432/digital_lab_e2e?schema=public';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: EXTERNAL ? undefined : './e2e/global-setup.ts',
  grep: EXTERNAL ? /@smoke/ : undefined,
  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: EXTERNAL
    ? undefined
    : {
        command: `node -e "require('fs').rmSync('.next/cache/fetch-cache',{recursive:true,force:true})" && npx next start -p ${PORT}`,
        url: `${BASE}/robots.txt`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          DATABASE_URL: E2E_DB,
          SITE_URL: BASE,
          STORAGE_DRIVER: 'local',
          LOCAL_STORAGE_DIR: './storage-e2e',
          EMAIL_PROVIDER: 'none',
          IP_HASH_SALT: 'e2e-test-salt-0123456789abcdef',
          NODE_ENV: 'production',
        },
      },
});
