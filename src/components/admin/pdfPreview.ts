'use client';

/**
 * Renders the first page of a PDF to a PNG in the browser (pdf.js), so a certificate PDF
 * gets an image preview without any server-side PDF tooling. Returns null on failure.
 */
export async function renderPdfFirstPage(file: Blob, maxWidth = 2000): Promise<Blob | null> {
  try {
    const pdfjs = await import('pdfjs-dist');
    // Copied into /public by scripts/copy-pdf-worker.mjs (postinstall / prebuild).
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(3, maxWidth / base.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    await doc.destroy();
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  } catch (err) {
    console.warn('PDF preview generation failed', err);
    return null;
  }
}
