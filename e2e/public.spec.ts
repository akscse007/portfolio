import { expect, test } from '@playwright/test';

test.describe('public site', () => {
  test('home renders the hero, trajectory and key sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/I build systems/i);
    await expect(
      page
        .locator('[data-hero-fade]')
        .getByText(/From mathematical foundations to intelligent software/),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Explore my work/i })).toBeVisible();
    await expect(page.locator('#trajectory')).toBeAttached();
    await expect(page.getByRole('heading', { name: /Proof of work/i })).toBeAttached();
    await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
  });

  test('security headers are present', async ({ request }) => {
    const res = await request.get('/');
    const h = res.headers();
    expect(h['content-security-policy']).toContain("frame-ancestors 'self'");
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h['x-powered-by']).toBeUndefined();
  });

  test('unknown routes and drafts return a real 404', async ({ page }) => {
    const missing = await page.goto('/this-page-does-not-exist');
    expect(missing?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/undefined here/i);
    expect((await page.goto('/blog/database-indexing-and-query-optimization'))?.status()).toBe(404);
    expect((await page.goto('/achievements/hostel-general-secretary'))?.status()).toBe(404);
    expect((await page.goto('/work/nifty-50-quant-research'))?.status()).toBe(404);
  });

  test('drafts are excluded from the sitemap and feeds; admin is disallowed in robots', async ({
    request,
  }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('/work/iic-cu-platform');
    expect(sitemap).not.toContain('database-indexing-and-query-optimization');
    expect(sitemap).not.toContain('hostel-general-secretary');
    expect(sitemap).not.toContain('/admin');
    const rss = await (await request.get('/feed.xml')).text();
    expect(rss).toContain('<rss');
    expect(rss).not.toContain('database-indexing-and-query-optimization');
    expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /admin');
  });

  test('blog article renders math, code and a table of contents', async ({ page }) => {
    await page.goto('/blog/linear-algebra-for-machine-learning');
    await expect(page.locator('.katex').first()).toBeVisible();
    await expect(page.locator('pre code.hljs').first()).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Table of contents' }).first(),
    ).toBeAttached();
    await expect(page.getByRole('button', { name: /Copy .*code/i }).first()).toBeAttached();
  });

  test('project filtering updates the URL', async ({ page }) => {
    await page.goto('/work', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^AI\/ML/ }).click();
    await expect(page).toHaveURL(/category=AI%2FML/);
    await expect(page.getByRole('heading', { name: 'MedAI Guardian' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'IIC-CU Platform' })).toHaveCount(0);
  });

  test('playground expression input rejects code and plots valid functions', async ({ page }) => {
    await page.goto('/playground#functions', { waitUntil: 'networkidle' });
    const input = page.getByRole('textbox', { name: 'f(x) =' });
    await input.fill('constructor');
    await page.getByRole('button', { name: 'Plot' }).click();
    await expect(page.locator('#fn-error')).toContainText(/Unknown name/);
    await input.fill('sin(2x) * x');
    await page.getByRole('button', { name: 'Plot' }).click();
    await expect(page.locator('#fn-error')).toHaveCount(0);
  });

  test('contact form shows server validation errors', async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'networkidle' });
    await page.getByLabel('Your name').fill('E2E Visitor');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Subject').fill('Testing');
    await page.getByLabel('Message').fill('short');
    await page.getByRole('button', { name: /Send message/ }).click();
    await expect(page.locator('form [role="alert"]').first()).toContainText(
      /Validation failed|quick/i,
    );
  });
});

test.describe('mobile navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('menu opens, traps focus, and closes with Escape', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const button = page.locator('button[aria-controls="mobile-menu"]');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const menu = page.locator('#mobile-menu');
    await expect(menu.getByRole('link', { name: /Achievements/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
  });
});
