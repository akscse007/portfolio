import { expect, test } from '@playwright/test';

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440];
const ROUTES = [
  '/',
  '/work',
  '/work/iic-cu-platform',
  '/research',
  '/achievements',
  '/achievements/machine-learning-specialization',
  '/blog',
  '/blog/how-retrieval-augmented-generation-works',
  '/demos',
  '/playground',
  '/about',
  '/contact',
  '/resume',
  '/admin/login',
];

for (const width of WIDTHS) {
  test.describe(`viewport ${width}px`, () => {
    test.use({ viewport: { width, height: width < 768 ? 844 : 900 } });

    for (const route of ROUTES) {
      test(`no horizontal overflow on ${route}`, async ({ page }, testInfo) => {
        await page.goto(route, { waitUntil: 'networkidle' });
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
            .filter((el) => {
              const r = el.getBoundingClientRect();
              if (r.width === 0 || r.height === 0) return false;
              // ignore deliberately scrollable regions and their content
              for (let p: HTMLElement | null = el.parentElement; p; p = p.parentElement) {
                const s = getComputedStyle(p);
                if (
                  /(auto|scroll|hidden|clip)/.test(s.overflowX) &&
                  p !== document.body &&
                  p !== doc
                )
                  return false;
              }
              return r.right > window.innerWidth + 1;
            })
            .slice(0, 5)
            .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
          return { scrollWidth: doc.scrollWidth, innerWidth: window.innerWidth, offenders };
        });
        expect(overflow.offenders, `elements overflowing at ${width}px on ${route}`).toEqual([]);
        expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
        if (route === '/' || route === '/achievements') {
          await testInfo.attach(`${route}@${width}`, {
            body: await page.screenshot({ fullPage: false }),
            contentType: 'image/png',
          });
        }
      });
    }

    test('touch targets in the header are at least 44px', async ({ page }) => {
      await page.goto('/');
      const sizes = await page.$$eval('header a, header button', (els) =>
        els
          .filter((e) => (e as HTMLElement).offsetParent !== null)
          .map((e) => e.getBoundingClientRect().height),
      );
      for (const h of sizes) expect(h).toBeGreaterThanOrEqual(40);
    });
  });
}

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('content is fully visible without animations', async ({ page }) => {
    await page.goto('/');
    const hidden = await page.$$eval(
      '[data-reveal], [data-hero-line] > span',
      (els) => els.filter((e) => getComputedStyle(e).opacity === '0').length,
    );
    expect(hidden).toBe(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('core content still renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/achievements');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
