import { expect, test, type Page } from '@playwright/test';

/**
 * Read-only smoke suite (@smoke): direct loads, refreshes and client-side navigation across every
 * public route, failing on any uncaught page error, runtime-error screen or 5xx response.
 * Safe to run against a real database:  E2E_BASE_URL=http://localhost:3000 npx playwright test
 */

const ROUTES = [
  '/',
  '/work',
  '/research',
  '/achievements',
  '/blog',
  '/demos',
  '/playground',
  '/about',
  '/contact',
  '/resume',
  '/privacy',
  '/terms',
];

function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // Missing media and third-party resources are reported elsewhere; app/runtime errors are not.
    if (/Failed to load resource/.test(text)) return;
    problems.push(`console.error: ${text}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 500) problems.push(`HTTP ${res.status()} ${res.url()}`);
  });
  return problems;
}

async function assertHealthy(page: Page, problems: string[], label: string) {
  await expect(page.getByText(/Something diverged/i), `${label}: runtime error screen`).toHaveCount(
    0,
  );
  await expect(page.locator('main, #main').first(), `${label}: main landmark`).toBeVisible();
  expect(problems, `${label}: runtime problems`).toEqual([]);
}

test.describe('@smoke public routes', () => {
  for (const route of ROUTES) {
    test(`direct load and refresh ${route}`, async ({ page }) => {
      const problems = watch(page);
      const res = await page.goto(route, { waitUntil: 'networkidle' });
      expect(res?.status(), `${route} status`).toBe(200);
      await assertHealthy(page, problems, route);
      await page.reload({ waitUntil: 'networkidle' });
      await assertHealthy(page, problems, `${route} (refresh)`);
    });
  }

  test('client-side navigation through the primary menu, repeatedly', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const problems = watch(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    const nav = page.getByRole('navigation', { name: 'Primary', exact: true });
    const hrefs = [
      '/work',
      '/research',
      '/achievements',
      '/blog',
      '/demos',
      '/playground',
      '/about',
      '/contact',
    ];
    for (let round = 0; round < 2; round++) {
      for (const label of hrefs) {
        await nav.locator(`a[href="${label}"]`).click();
        await page.waitForURL((u) => u.pathname === label);
        await page.waitForLoadState('networkidle');
        await assertHealthy(page, problems, `nav → ${label} (round ${round + 1})`);
      }
      await page.getByRole('link', { name: /home/i }).first().click();
      await page.waitForLoadState('networkidle');
      await assertHealthy(page, problems, `nav → home (round ${round + 1})`);
    }
  });

  test('client-side navigation through the mobile menu at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const problems = watch(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    const toggle = page.locator('button[aria-controls="mobile-menu"]');
    for (const href of ['/work', '/achievements', '/blog', '/playground', '/contact']) {
      await toggle.click();
      await page.locator(`#mobile-menu a[href="${href}"]`).click();
      await page.waitForURL((u) => u.pathname === href);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#mobile-menu')).toBeHidden();
      await assertHealthy(page, problems, `mobile nav → ${href}`);
    }
  });

  test('work listing → case study → back, filters and next/previous', async ({ page }) => {
    const problems = watch(page);
    await page.goto('/work', { waitUntil: 'networkidle' });
    const filters = page.getByRole('group', { name: /Filter projects/ }).getByRole('button');
    const count = await filters.count();
    for (let i = 0; i < count; i++) {
      await filters.nth(i).click();
      await assertHealthy(page, problems, `work filter ${i}`);
    }
    await filters.first().click();
    const cards = page.locator('main ol a[href^="/work/"]');
    const total = await cards.count();
    expect(total).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(total, 4); i++) {
      await page.locator('main ol a[href^="/work/"]').nth(i).click();
      await page.waitForURL(/\/work\/[a-z0-9-]+$/);
      await page.waitForLoadState('networkidle');
      await assertHealthy(page, problems, `case study ${i}`);
      const next = page
        .getByRole('navigation', { name: 'Adjacent entries' })
        .getByRole('link')
        .last();
      if (await next.count()) {
        await next.click();
        await page.waitForLoadState('networkidle');
        await assertHealthy(page, problems, `case study ${i} → adjacent`);
      }
      await page.goto('/work', { waitUntil: 'networkidle' });
    }
  });

  test('achievement and blog detail pages open from their listings', async ({ page }) => {
    const problems = watch(page);
    await page.goto('/achievements', { waitUntil: 'networkidle' });
    const ach = page.locator('main a[href^="/achievements/"]').first();
    if (await ach.count()) {
      await ach.click();
      await page.waitForURL(/\/achievements\/[a-z0-9-]+$/);
      await page.waitForLoadState('networkidle');
      await assertHealthy(page, problems, 'achievement detail');
    }
    await page.goto('/blog', { waitUntil: 'networkidle' });
    const post = page.locator('main a[href^="/blog/"]').first();
    if (await post.count()) {
      await post.click();
      await page.waitForURL(/\/blog\/[a-z0-9-]+$/);
      await page.waitForLoadState('networkidle');
      await assertHealthy(page, problems, 'blog detail');
      const topic = page.locator('nav[aria-label="Breadcrumb"] a[href^="/topics/"]').first();
      if (await topic.count()) {
        await topic.click();
        await page.waitForLoadState('networkidle');
        await assertHealthy(page, problems, 'topic page');
      }
    }
  });

  test('unknown records return 404 without a runtime error', async ({ page }) => {
    for (const url of [
      '/work/no-such-project',
      '/achievements/no-such-record',
      '/blog/no-such-post',
      '/topics/no-such-topic',
    ]) {
      const res = await page.goto(url);
      expect(res?.status(), url).toBe(404);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(/undefined here/i);
    }
  });
});
