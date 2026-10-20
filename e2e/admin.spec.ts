import { expect, test, type Page } from '@playwright/test';
import { E2E_ADMIN } from './fixtures/credentials';

async function login(page: Page) {
  await page.goto('/admin/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill(E2E_ADMIN.email);
  await page.getByLabel('Password').fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.describe('admin', () => {
  test('protected pages redirect to login; wrong password is rejected', async ({ page }) => {
    await page.goto('/admin/posts');
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fposts/);
    await page.getByLabel('Email').fill(E2E_ADMIN.email);
    await page.getByLabel('Password').fill('definitely-wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('#login-error')).toContainText(/Invalid email or password/);
  });

  test('admin pages are noindex', async ({ request }) => {
    const res = await request.get('/admin/login');
    expect(res.headers()['x-robots-tag']).toContain('noindex');
  });

  test('write, preview and publish a post; it becomes public', async ({ page, context }) => {
    await login(page);
    await page.goto('/admin/posts/new', { waitUntil: 'networkidle' });
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill('E2E Published Note');
    await expect(page.getByLabel('Slug')).toHaveValue('e2e-published-note');
    await page.getByLabel('Excerpt').fill('Created by the end-to-end test suite.');
    await page
      .locator('#post-content')
      .fill('## Hello\n\nInline math $e^{i\\pi}+1=0$.\n\n```ts\nconst x = 1;\n```');
    await expect(page.locator('#editor-preview .katex').first()).toBeVisible();

    const anon = await context.browser()!.newContext();
    const visitor = await anon.newPage();
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page).toHaveURL(/\/admin\/posts\/[a-z0-9]+$/);
    expect((await visitor.goto('/blog/e2e-published-note'))?.status()).toBe(404);

    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByRole('status').filter({ hasText: /^Published$/ })).toBeVisible();
    const res = await visitor.goto('/blog/e2e-published-note');
    expect(res?.status()).toBe(200);
    await expect(visitor.getByRole('heading', { level: 1 })).toHaveText('E2E Published Note');
    await anon.close();
  });

  test('achievement editor exposes privacy controls and logout ends the session', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/admin/achievements', { waitUntil: 'networkidle' });
    await expect(page.getByRole('link', { name: /Hostel General Secretary/ })).toBeVisible();
    await page.getByRole('link', { name: /Hostel General Secretary/ }).click();
    await expect(page.getByRole('switch', { name: /Preview approved/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(page.getByRole('switch', { name: /Original document is public/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(page.getByRole('heading', { name: 'Original certificate' })).toBeVisible();

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
