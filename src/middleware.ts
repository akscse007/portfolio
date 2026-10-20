import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-dl_session' : 'dl_session';

function buildCsp(nonce: string | null) {
  const dev = process.env.NODE_ENV !== 'production';
  const mediaOrigin = process.env.MEDIA_ORIGIN ? ` ${process.env.MEDIA_ORIGIN}` : '';
  const script = nonce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`
    : `'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`;
  return [
    `default-src 'self'`,
    `script-src ${script}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://i.ytimg.com https://i.vimeocdn.com${mediaOrigin}`,
    `media-src 'self' blob:${mediaOrigin}`,
    `font-src 'self' data:`,
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    `frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com${mediaOrigin}`,
    `worker-src 'self' blob:`,
    `frame-ancestors 'self'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    ...(!dev && (process.env.SITE_URL ?? '').startsWith('https://')
      ? ['upgrade-insecure-requests']
      : []),
  ].join('; ');
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Cheap gate for the admin UI; every page and API still validates the session server-side.
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!req.cookies.get(SESSION_COOKIE)?.value) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
  }

  const strict = process.env.CSP_MODE === 'strict';
  const nonce = strict ? btoa(crypto.randomUUID()) : null;
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(req.headers);
  if (nonce) {
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', csp);
  }
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  if (pathname.startsWith('/admin')) {
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return res;
}

export const config = {
  matcher: [
    // Skip static assets and the media route (which sets its own headers).
    '/((?!_next/static|_next/image|media/|favicon.ico|icon.svg|apple-icon|robots.txt|sitemap.xml|feed.xml|atom.xml|pdf.worker.min.mjs).*)',
  ],
};
