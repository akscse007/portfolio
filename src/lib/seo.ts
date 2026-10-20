import type { Metadata } from 'next';
import { siteUrl } from '@/lib/utils';

export const SITE = {
  name: 'Akash Roy — Digital Lab',
  short: 'AKASH ROY — DIGITAL LAB',
  description:
    'Akash Roy — AI Engineer and Full-Stack Developer from Kolkata. Mathematics, intelligent software, research notes and proof of work.',
  locale: 'en_IN',
};

type PageMeta = {
  title: string;
  description?: string;
  path: string;
  image?: string | null;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  canonical?: string | null;
};

export function pageMetadata(m: PageMeta): Metadata {
  const canonical = m.canonical || siteUrl(m.path);
  const description = m.description || SITE.description;
  const images = m.image
    ? [{ url: m.image.startsWith('http') ? m.image : siteUrl(m.image) }]
    : undefined;
  return {
    title: m.title,
    description,
    alternates: { canonical },
    robots: m.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: m.title,
      description,
      url: canonical,
      siteName: SITE.name,
      locale: SITE.locale,
      type: m.type ?? 'website',
      ...(images ? { images } : {}),
      ...(m.type === 'article'
        ? { publishedTime: m.publishedTime ?? undefined, modifiedTime: m.modifiedTime ?? undefined }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: m.title,
      description,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
  };
}

// ── Structured data (only facts present in the database) ──────────

export function personJsonLd(p: {
  name: string;
  headline: string;
  location: string;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  email?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.name,
    jobTitle: p.headline,
    url: siteUrl('/'),
    address: { '@type': 'PostalAddress', addressLocality: p.location.split(',')[0]?.trim() },
    sameAs: [p.githubUrl, p.linkedinUrl].filter(Boolean),
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: siteUrl('/'),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: siteUrl(it.path),
    })),
  };
}

export function blogPostingJsonLd(p: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string | null;
  updatedAt: string;
  author: string;
  image?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.description,
    url: siteUrl(`/blog/${p.slug}`),
    mainEntityOfPage: siteUrl(`/blog/${p.slug}`),
    datePublished: p.publishedAt ?? undefined,
    dateModified: p.updatedAt,
    author: { '@type': 'Person', name: p.author, url: siteUrl('/about') },
    ...(p.image ? { image: siteUrl(p.image) } : {}),
  };
}

/** Serialises JSON-LD safely for embedding in a <script> tag. */
export function jsonLdString(data: unknown) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
