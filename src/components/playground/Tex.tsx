import katex from 'katex';

/** Server-rendered KaTeX for fixed, author-written notation (no user input). */
export function Tex({ children, display = false }: { children: string; display?: boolean }) {
  const html = katex.renderToString(children, {
    displayMode: display,
    throwOnError: false,
    output: 'htmlAndMathml',
  });
  return display ? (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}
