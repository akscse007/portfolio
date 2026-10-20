import { describe, expect, it } from 'vitest';
import { markdownToPlain, renderMarkdown } from '@/lib/markdown';

describe('markdown rendering & sanitisation', () => {
  it('strips raw HTML, scripts and event handlers', async () => {
    const { html } = await renderMarkdown(
      '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n<iframe src="https://evil"></iframe>\n\nHello <b onclick="x()">bold</b>',
    );
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/onerror|onclick/i);
    expect(html).not.toMatch(/<iframe/i);
    expect(html).toContain('Hello');
  });

  it('removes javascript: and data: links', async () => {
    const { html } = await renderMarkdown(
      '[click](javascript:alert(1)) and [d](data:text/html,x) and ![i](javascript:x)',
    );
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/data:text/i);
  });

  it('renders KaTeX math', async () => {
    const r = await renderMarkdown(
      'Inline $a^2 + b^2 = c^2$ and display:\n\n$$\n\\nabla L(\\theta)\n$$',
    );
    expect(r.html).toContain('class="katex"');
    expect(r.html).toContain('katex-display');
    expect(r.hasMath).toBe(true);
  });

  it('highlights code and keeps it escaped', async () => {
    const { html } = await renderMarkdown('```python\nprint("<b>")\n```');
    expect(html).toContain('hljs');
    expect(html).toContain('&#x3C;b>');
    expect(html).not.toContain('<b>');
  });

  it('builds a table of contents with slug ids', async () => {
    const r = await renderMarkdown('## First section\n\ntext\n\n### Sub part\n\n## Second');
    expect(r.toc).toEqual([
      { id: 'first-section', text: 'First section', depth: 2 },
      { id: 'sub-part', text: 'Sub part', depth: 3 },
      { id: 'second', text: 'Second', depth: 2 },
    ]);
    expect(r.html).toContain('id="first-section"');
  });

  it('turns mermaid blocks into figures and GitHub callouts into notes', async () => {
    const r = await renderMarkdown(
      '```mermaid\nflowchart LR\n A-->B\n```\n\n> [!TIP]\n> Remember this.',
    );
    expect(r.hasMermaid).toBe(true);
    expect(r.html).toContain('data-mermaid');
    expect(r.html).toContain('class="callout callout-tip"');
    expect(r.html).not.toContain('[!TIP]');
  });

  it('marks external links safe and lazy-loads images', async () => {
    const { html } = await renderMarkdown('[ext](https://example.com) ![alt text](/media/abc)');
    expect(html).toMatch(/rel="noopener noreferrer nofollow"/);
    expect(html).toMatch(/loading="lazy"/);
  });

  it('renders GFM tables', async () => {
    const { html } = await renderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |');
    expect(html).toContain('<table>');
  });

  it('produces plain-text excerpts', () => {
    expect(markdownToPlain('## Title\n\nSome **bold** [link](http://x) `code`', 100)).toBe(
      'Title Some bold link code',
    );
  });
});
