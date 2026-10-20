import { getPosts, getProfile } from '@/server/repos/public';
import { siteUrl } from '@/lib/utils';

export function xmlEscape(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}

export async function buildRss() {
  const [posts, profile] = await Promise.all([getPosts(), getProfile()]);
  const author = profile?.name ?? 'Akash Roy';
  const items = posts
    .slice(0, 50)
    .map(
      (p) => `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${siteUrl(`/blog/${p.slug}`)}</link>
      <guid isPermaLink="true">${siteUrl(`/blog/${p.slug}`)}</guid>
      <description>${xmlEscape(p.excerpt)}</description>
      ${p.publishedAt ? `<pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>` : ''}
      ${p.topic ? `<category>${xmlEscape(p.topic.name)}</category>` : ''}
      <dc:creator>${xmlEscape(author)}</dc:creator>
    </item>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xmlEscape(`${author} — Notes`)}</title>
    <link>${siteUrl('/blog')}</link>
    <description>First-principles notes on mathematics, computer science and machine learning.</description>
    <language>en-IN</language>
    <atom:link href="${siteUrl('/feed.xml')}" rel="self" type="application/rss+xml" />
    ${posts[0]?.publishedAt ? `<lastBuildDate>${new Date(posts[0].publishedAt).toUTCString()}</lastBuildDate>` : ''}
${items}
  </channel>
</rss>`;
}

export async function buildAtom() {
  const [posts, profile] = await Promise.all([getPosts(), getProfile()]);
  const author = profile?.name ?? 'Akash Roy';
  const updated = posts[0]?.updatedAt ?? new Date().toISOString();
  const entries = posts
    .slice(0, 50)
    .map(
      (p) => `  <entry>
    <title>${xmlEscape(p.title)}</title>
    <link href="${siteUrl(`/blog/${p.slug}`)}" />
    <id>${siteUrl(`/blog/${p.slug}`)}</id>
    <published>${p.publishedAt ?? p.updatedAt}</published>
    <updated>${p.updatedAt}</updated>
    <summary>${xmlEscape(p.excerpt)}</summary>
    ${p.topic ? `<category term="${xmlEscape(p.topic.name)}" />` : ''}
  </entry>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${xmlEscape(`${author} — Notes`)}</title>
  <link href="${siteUrl('/blog')}" />
  <link rel="self" href="${siteUrl('/atom.xml')}" />
  <id>${siteUrl('/blog')}</id>
  <updated>${updated}</updated>
  <author><name>${xmlEscape(author)}</name></author>
${entries}
</feed>`;
}
