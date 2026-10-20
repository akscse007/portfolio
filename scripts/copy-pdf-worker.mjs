// Copies the pdf.js worker into /public so the admin can render PDF previews in the browser.
// Runs automatically on `npm install` (postinstall) and before `npm run build`.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
try {
  const pkg = path.dirname(require.resolve('pdfjs-dist/package.json'));
  const src = path.join(pkg, 'build', 'pdf.worker.min.mjs');
  if (!existsSync(src)) throw new Error(`worker not found at ${src}`);
  mkdirSync('public', { recursive: true });
  copyFileSync(src, path.join('public', 'pdf.worker.min.mjs'));
  console.log('pdf.js worker copied to public/pdf.worker.min.mjs');
} catch (err) {
  console.warn(`[copy-pdf-worker] skipped: ${err instanceof Error ? err.message : err}`);
}
