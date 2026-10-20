// Test-only credentials for the throwaway E2E database. Never used anywhere else.
export const E2E_ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL || 'e2e-owner@example.test',
  password: process.env.E2E_ADMIN_PASSWORD || 'E2E-Only-Passw0rd!',
};
