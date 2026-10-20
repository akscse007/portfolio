'use client';

import { useEffect } from 'react';

/**
 * Progressive enhancements for rendered articles:
 *  - copy buttons on code blocks
 *  - Mermaid diagrams (library loaded only when the article contains one);
 *    the source stays available in a <details> element for screen readers / failures.
 */
export function ArticleEnhancer({ rootId, hasMermaid }: { rootId: string; hasMermaid: boolean }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;
    const cleanups: (() => void)[] = [];

    root.querySelectorAll<HTMLPreElement>('pre:not(.mermaid-source)').forEach((pre) => {
      if (pre.dataset.enhanced) return;
      pre.dataset.enhanced = 'true';
      const lang = pre.querySelector('code')?.className.match(/language-([\w-]+)/)?.[1];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'absolute right-2 top-2 rounded-xs border border-line bg-bg/80 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted hover:text-fg';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', `Copy ${lang ?? ''} code to clipboard`.replace('  ', ' '));
      const onClick = async () => {
        try {
          await navigator.clipboard.writeText(
            pre.querySelector('code')?.innerText ?? pre.innerText,
          );
          btn.textContent = 'Copied';
        } catch {
          btn.textContent = 'Press Ctrl+C';
        }
        window.setTimeout(() => (btn.textContent = 'Copy'), 1600);
      };
      btn.addEventListener('click', onClick);
      pre.appendChild(btn);
      if (lang && lang !== 'text') {
        const tag = document.createElement('span');
        tag.className =
          'pointer-events-none absolute left-3 top-2 font-mono text-[0.6rem] uppercase tracking-wider text-muted';
        tag.textContent = lang;
        tag.setAttribute('aria-hidden', 'true');
        pre.style.paddingTop = '2rem';
        pre.appendChild(tag);
      }
      cleanups.push(() => btn.removeEventListener('click', onClick));
    });

    if (hasMermaid) {
      const blocks = Array.from(root.querySelectorAll<HTMLElement>('figure[data-mermaid]'));
      if (blocks.length) {
        (async () => {
          try {
            const { default: mermaid } = await import('mermaid');
            const dark = document.documentElement.getAttribute('data-theme') !== 'light';
            mermaid.initialize({
              startOnLoad: false,
              theme: dark ? 'dark' : 'neutral',
              securityLevel: 'strict',
              fontFamily: 'inherit',
            });
            for (const [i, fig] of blocks.entries()) {
              if (fig.dataset.rendered) continue;
              const source = fig.querySelector('pre')?.textContent ?? '';
              const { svg } = await mermaid.render(`mmd-${rootId}-${i}`, source);
              const holder = document.createElement('div');
              holder.className = 'mermaid-svg overflow-x-auto';
              holder.setAttribute('role', 'img');
              holder.setAttribute('aria-label', 'Diagram. The diagram source is available below.');
              holder.innerHTML = svg;
              const details = document.createElement('details');
              details.className = 'mt-2 text-sm text-muted';
              const summary = document.createElement('summary');
              summary.textContent = 'Diagram source (text)';
              details.appendChild(summary);
              const pre = fig.querySelector('pre');
              if (pre) details.appendChild(pre);
              fig.replaceChildren(holder, details);
              fig.dataset.rendered = 'true';
            }
          } catch (err) {
            console.warn('Mermaid render failed; showing source instead.', err);
          }
        })();
      }
    }
    return () => cleanups.forEach((c) => c());
  }, [rootId, hasMermaid]);
  return null;
}
