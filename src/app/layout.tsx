import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Archivo, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import { SITE } from '@/lib/seo';
import 'katex/dist/katex.min.css';
import './globals.css';

const sans = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-sans',
  display: 'swap',
});
const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  title: { default: SITE.short, template: `%s — Akash Roy` },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: 'Akash Roy' }],
  creator: 'Akash Roy',
  formatDetection: { telephone: false },
  alternates: {
    types: {
      'application/rss+xml': [{ url: '/feed.xml', title: 'Akash Roy — Notes (RSS)' }],
      'application/atom+xml': [{ url: '/atom.xml', title: 'Akash Roy — Notes (Atom)' }],
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0e0f0c' },
    { media: '(prefers-color-scheme: light)', color: '#f3f1ea' },
  ],
};

// Runs before paint: applies the saved theme and flags JS/motion capability for progressive enhancement.
const bootScript = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('dl-theme');if(t==='light'||t==='dark'){d.setAttribute('data-theme',t)}d.classList.add('js');if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('js-motion')}}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = process.env.CSP_MODE === 'strict'
    ? (await headers()).get('x-nonce') ?? undefined
    : undefined;
  return (
    <html
      lang="en-IN"
      data-theme="dark"
      className={`${sans.variable} ${serif.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
