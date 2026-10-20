'use client';

import { useState } from 'react';

export function ShareLinks({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const links = [
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { label: 'X', href: `https://x.com/intent/post?url=${enc(url)}&text=${enc(title)}` },
    { label: 'Email', href: `mailto:?subject=${enc(title)}&body=${enc(url)}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label mr-1">Share</span>
      <button
        type="button"
        className="chip"
        onClick={async () => {
          try {
            if (navigator.share) await navigator.share({ title, url });
            else {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }
          } catch {
            /* dismissed */
          }
        }}
      >
        {copied ? 'Link copied' : 'Copy link'}
      </button>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="chip">
          {l.label}
        </a>
      ))}
    </div>
  );
}
