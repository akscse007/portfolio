import { expect, test } from '@playwright/test';

test.describe('achievements gallery', () => {
  test('counts come from published records only', async ({ page }) => {
    await page.goto('/achievements', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Proof of/i);
    const count = page.locator('dt:has-text("Published records") + dd');
    // seed publishes samples for this fixture DB except the one kept as draft
    await expect(count).not.toHaveText('0');
    await expect(page.getByText('Hostel General Secretary')).toHaveCount(0);
  });

  test('filters by category and search, with shareable URLs and reset', async ({ page }) => {
    await page.goto('/achievements', { waitUntil: 'networkidle' });
    await page.getByLabel('Category').selectOption('ACADEMIC');
    await expect(page).toHaveURL(/category=ACADEMIC/);
    const grid = page.getByTestId('achievement-grid');
    await expect(grid.getByRole('heading', { name: /CUET PG Mathematics/ })).toBeVisible();
    await expect(
      grid.getByRole('heading', { name: /Machine Learning Specialization/ }),
    ).toHaveCount(0);

    await page.getByRole('searchbox', { name: 'Search' }).fill('zzzz-no-such-thing');
    await page.getByRole('button', { name: 'Go' }).click();
    await expect(page.getByText('Nothing matches those filters')).toBeVisible();
    await page
      .getByRole('button', { name: /Reset filters/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/achievements$/);
  });

  test('lightbox opens, navigates with the keyboard and closes with Escape', async ({ page }) => {
    await page.goto('/achievements', { waitUntil: 'networkidle' });
    const grid = page.getByTestId('achievement-grid');
    await grid.getByTestId('open-lightbox').first().click();
    const dialog = page.getByTestId('lightbox');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    const counter = dialog.locator('p').first();
    const first = await counter.textContent();
    await page.keyboard.press('ArrowRight');
    await expect(counter).not.toHaveText(first ?? '');
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await expect(dialog.getByText('140%')).toBeVisible();
    await page.keyboard.press('0');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('detail page shows metadata, placeholder rules and navigation', async ({ page }) => {
    await page.goto('/achievements/machine-learning-specialization', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Machine Learning Specialization',
    );
    await expect(page.getByText('No public verification link')).toBeVisible();
    await page.getByRole('button', { name: 'View certificate', exact: true }).click();
    await expect(page.getByTestId('lightbox')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('link', { name: /Back to the archive/ })).toBeVisible();
  });
});
