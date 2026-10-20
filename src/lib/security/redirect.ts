/**
 * Only allow same-site relative paths for post-login redirects.
 * Rejects absolute URLs, protocol-relative URLs, backslash tricks and control chars.
 */
export function safeRedirectPath(input: string | null | undefined, fallback = '/admin'): string {
  if (!input || typeof input !== 'string') return fallback;
  if (input.length > 512) return fallback;

  if (/[\u0000-\u001f\u007f]/.test(input)) return fallback;
  if (!input.startsWith('/')) return fallback;
  if (input.startsWith('//')) return fallback;
  if (input.includes('\\')) return fallback;
  try {
    const url = new URL(input, 'http://local.invalid');
    if (url.origin !== 'http://local.invalid') return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** Restrict admin-only redirects to the admin area. */
export function safeAdminRedirect(input: string | null | undefined) {
  const path = safeRedirectPath(input, '/admin');
  return path === '/admin' || path.startsWith('/admin/') ? path : '/admin';
}
