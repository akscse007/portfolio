import path from 'node:path';
import { defineConfig } from 'vitest/config';

const TEST_DB =
  process.env.DATABASE_URL_TEST ||
  'postgresql://postgres:postgres@localhost:5432/digital_lab_test?schema=public';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'server-only': path.resolve(__dirname, 'tests/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['tests/setup/next-mocks.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['tests/integration/global-setup.ts'],
          pool: 'forks',
          poolOptions: { forks: { singleFork: true } },
          testTimeout: 30_000,
          hookTimeout: 120_000,
          env: {
            DATABASE_URL: TEST_DB,
            STORAGE_DRIVER: 'local',
            LOCAL_STORAGE_DIR: './storage-test',
            EMAIL_PROVIDER: 'none',
            IP_HASH_SALT: 'integration-test-salt-0123456789',
            SITE_URL: 'http://localhost:3000',
          },
        },
      },
    ],
  },
});
