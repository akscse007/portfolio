import { unified, type Plugin } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { toString as hastToString } from 'hast-util-to-string';
import type { Root as MdRoot, Blockquote, Paragraph, Text } from 'mdast';
import type { Root as HastRoot, Element } from 'hast';

export type TocItem = { id: string; text: string; depth: 2 | 3 };
export type RenderedMarkdown = {
  html: string;
  toc: TocItem[];
  hasMermaid: boolean;
  hasMath: boolean;
};

type CalloutKind = 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';

/** GitHub-style callouts: `> [!NOTE]` → <div class="callout" data-kind="note"> */
const remarkCallouts: Plugin<[], MdRoot> = () => (tree) => {
  visit(tree, 'blockquote', (node: Blockquote) => {
    const first = node.children[0] as Paragraph | undefined;
    if (!first || first.type !== 'paragraph') return;
    const text = first.children[0] as Text | undefined;
    if (!text || text.type !== 'text') return;
    const m = text.value.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i);
    if (!m) return;
    const kind = m[1]!.toUpperCase() as CalloutKind;
    text.value = text.value.slice(m[0].length);
    if (!text.value && first.children.length === 1) node.children.shift();
    node.data = {
      ...(node.data ?? {}),
      hName: 'div',
      hProperties: {
        className: ['callout', `callout-${kind.toLowerCase()}`],
        dataKind: kind.toLowerCase(),
        role: 'note',
      },
    };
  });
};

const schema: SanitizeSchema = {
  ...defaultSchema,
  // Keep heading ids generated later by rehype-slug clean; user-supplied ids still get clobbered.
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ['className', /^language-./, 'math-inline', 'math-display'],
    ],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      ['className', 'callout', /^callout-[a-z]+$/],
      'dataKind',
      'role',
    ],
    img: [...(defaultSchema.attributes?.img ?? []), 'loading', 'decoding', 'width', 'height'],
    th: [...(defaultSchema.attributes?.th ?? []), 'align'],
    td: [...(defaultSchema.attributes?.td ?? []), 'align'],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https'],
  },
};

/** Post-sanitize enhancements: lazy images, safe external links, mermaid blocks, TOC collection. */
const rehypeEnhance: Plugin<
  [{ toc: TocItem[]; flags: { mermaid: boolean; math: boolean } }],
  HastRoot
> =
  ({ toc, flags }) =>
  (tree) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName === 'img') {
        node.properties = { ...node.properties, loading: 'lazy', decoding: 'async' };
      }
      if (node.tagName === 'a') {
        const href = String(node.properties?.href ?? '');
        if (/^https?:\/\//i.test(href)) {
          node.properties = {
            ...node.properties,
            rel: ['noopener', 'noreferrer', 'nofollow'],
            target: '_blank',
          };
        }
      }
      if ((node.tagName === 'h2' || node.tagName === 'h3') && node.properties?.id) {
        toc.push({
          id: String(node.properties.id),
          text: hastToString(node).trim(),
          depth: node.tagName === 'h2' ? 2 : 3,
        });
      }
      if (
        node.tagName === 'span' &&
        Array.isArray(node.properties?.className) &&
        node.properties.className.includes('katex')
      ) {
        flags.math = true;
      }
      if (node.tagName === 'pre' && parent && typeof index === 'number') {
        const code = node.children[0] as Element | undefined;
        const cls = (code?.properties?.className as string[] | undefined) ?? [];
        if (code && cls.includes('language-mermaid')) {
          flags.mermaid = true;
          const source = hastToString(code);
          parent.children[index] = {
            type: 'element',
            tagName: 'figure',
            properties: { className: ['mermaid-block'], dataMermaid: '' },
            children: [
              {
                type: 'element',
                tagName: 'pre',
                properties: { className: ['mermaid-source'] },
                children: [{ type: 'text', value: source }],
              },
            ],
          };
        }
      }
    });
  };

/**
 * Markdown → sanitised HTML. Raw HTML in the source is dropped; sanitisation runs
 * before KaTeX and syntax highlighting so only trusted transforms add markup.
 */
export async function renderMarkdown(source: string): Promise<RenderedMarkdown> {
  const toc: TocItem[] = [];
  const flags = { mermaid: false, math: false };
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkCallouts)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize, schema)
    .use(rehypeKatex, { output: 'htmlAndMathml', strict: false })
    .use(rehypeHighlight, { detect: false, plainText: ['mermaid', 'math', 'text', 'txt'] })
    .use(rehypeSlug)
    .use(rehypeEnhance, { toc, flags })
    .use(rehypeStringify)
    .process(source);
  return { html: String(file), toc, hasMermaid: flags.mermaid, hasMath: flags.math };
}

/** Plain-text excerpt from markdown (for feeds/meta when no excerpt given). */
export function markdownToPlain(source: string, max = 200) {
  const text = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
