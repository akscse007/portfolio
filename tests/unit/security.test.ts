import { describe, expect, it } from 'vitest';
import { safeAdminRedirect, safeRedirectPath } from '@/lib/security/redirect';
import { sanitizeFilename, sniffFileType } from '@/lib/media/sniff';
import { hashPassword, passwordProblems, verifyPassword } from '@/lib/security/password';
import { clientIp, hashIp } from '@/lib/security/request';
import { safeEqual, sha256 } from '@/lib/security/tokens';
import { jsonLdString } from '@/lib/seo';
import { xmlEscape } from '@/lib/feed';
import { assertValidKey } from '@/lib/storage/types';

describe('open-redirect protection', () => {
  it.each([
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '\\\\evil',
    'javascript:alert(1)',
    '/admin\nx',
    'admin',
  ])('rejects %s', (u) => {
    expect(safeRedirectPath(u)).toBe('/admin');
  });
  it('keeps same-site paths with query and hash', () => {
    expect(safeRedirectPath('/admin/posts?x=1#y')).toBe('/admin/posts?x=1#y');
  });
  it('limits admin redirects to the admin area', () => {
    expect(safeAdminRedirect('/blog')).toBe('/admin');
    expect(safeAdminRedirect('/admin/media')).toBe('/admin/media');
  });
});

describe('file signature sniffing', () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);
  it('detects real types from magic bytes', () => {
    expect(sniffFileType(bytes(0xff, 0xd8, 0xff, 0xe0))?.mime).toBe('image/jpeg');
    expect(sniffFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.mime).toBe(
      'image/png',
    );
    expect(sniffFileType(new TextEncoder().encode('%PDF-1.7 rest of file ....'))?.kind).toBe('PDF');
    expect(
      sniffFileType(new TextEncoder().encode('WEBVTT\n\n00:00.000 --> 00:01.000\nHi'))?.mime,
    ).toBe('text/vtt');
    const mp4 = new Uint8Array(32);
    mp4.set(new TextEncoder().encode('ftypisom'), 4);
    expect(sniffFileType(mp4)?.mime).toBe('video/mp4');
  });
  it('rejects disguised or unsupported content', () => {
    expect(sniffFileType(new TextEncoder().encode('<svg onload="alert(1)"></svg>    '))).toBeNull();
    expect(sniffFileType(new TextEncoder().encode('<html><script>alert(1)</script>'))).toBeNull();
    expect(sniffFileType(new TextEncoder().encode('MZ executable file.....'))).toBeNull();
  });
  it('sanitises display filenames', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFilename('C:\\Users\\a\\cert<script>.pdf')).toBe('certscript.pdf');
    expect(sanitizeFilename('...hidden')).toBe('hidden');
  });
});

describe('storage keys', () => {
  it('accepts generated keys and rejects traversal', () => {
    expect(() => assertValidKey('2026/10/AbCdEfGhIjKlMnOpQrStUvWx.png')).not.toThrow();
    expect(() => assertValidKey('2026/10/AbCdEfGhIjKlMnOpQrStUvWx.thumb.webp')).not.toThrow();
    for (const bad of [
      '../secret.png',
      '2026/10/../../x.png',
      '/etc/passwd',
      '2026/10/short.png',
      '2026\\10\\AbCdEfGhIjKlMnOpQrStUvWx.png',
    ]) {
      expect(() => assertValidKey(bad)).toThrow();
    }
  });
});

describe('passwords', () => {
  it('enforces length and character variety', () => {
    expect(passwordProblems('short')).not.toHaveLength(0);
    expect(passwordProblems('alllowercaseletters')).not.toHaveLength(0);
    expect(passwordProblems('Sufficiently-Long-Passw0rd')).toHaveLength(0);
    expect(passwordProblems('Owner-Pass-12345', 'owner@example.com').join(' ')).toMatch(/email/);
  });
  it('hashes with argon2id and verifies', async () => {
    const h = await hashPassword('Correct-Horse-Battery-9');
    expect(h.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(h, 'Correct-Horse-Battery-9')).toBe(true);
    expect(await verifyPassword(h, 'wrong')).toBe(false);
    expect(await verifyPassword('not-a-hash', 'x')).toBe(false);
  });
});

describe('request helpers', () => {
  const headers = (h: Record<string, string>) => ({
    get: (k: string) => h[k.toLowerCase()] ?? null,
  });
  it('ignores spoofable leading X-Forwarded-For entries without a trusted proxy', () => {
    delete process.env.TRUST_PROXY;
    expect(clientIp(headers({ 'x-forwarded-for': '6.6.6.6, 10.0.0.2' }))).toBe('10.0.0.2');
  });
  it('uses the first entry behind a trusted proxy', () => {
    process.env.TRUST_PROXY = 'true';
    expect(clientIp(headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.2' }))).toBe('203.0.113.9');
    delete process.env.TRUST_PROXY;
  });
  it('hashes IPs (no raw IP storage)', () => {
    expect(hashIp('1.2.3.4')).toMatch(/^[a-f0-9]{32}$/);
    expect(hashIp('1.2.3.4')).not.toContain('1.2.3.4');
  });
  it('compares secrets in constant time', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(sha256('x')).toHaveLength(64);
  });
});

describe('output encoding', () => {
  it('JSON-LD cannot break out of its script tag', () => {
    const s = jsonLdString({ name: '</script><script>alert(1)</script>' });
    expect(s).not.toContain('</script>');
    expect(s).not.toContain('<');
  });
  it('XML feed escaping', () => {
    expect(xmlEscape(`<a href="x">Tom & 'Jerry'</a>\u0001`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;',
    );
  });
});
