/**
 * Detects a file's real type from its leading bytes ("magic numbers").
 * The declared MIME type and file extension are never trusted on their own.
 */
export type SniffedType =
  | {
      kind: 'IMAGE';
      mime: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'image/avif';
      ext: string;
    }
  | { kind: 'PDF'; mime: 'application/pdf'; ext: 'pdf' }
  | { kind: 'VIDEO'; mime: 'video/mp4' | 'video/webm'; ext: string }
  | { kind: 'DOCUMENT'; mime: 'text/vtt'; ext: 'vtt' };

const startsWith = (buf: Uint8Array, bytes: number[], offset = 0) =>
  bytes.every((b, i) => buf[offset + i] === b);

const ascii = (buf: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...buf.subarray(start, Math.min(end, buf.length)));

const MP4_BRANDS = ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V ', 'dash', 'iso5', 'iso6'];

export function sniffFileType(buf: Uint8Array): SniffedType | null {
  const bom = startsWith(buf, [0xef, 0xbb, 0xbf]) ? 3 : 0;
  if (ascii(buf, bom, bom + 6) === 'WEBVTT')
    return { kind: 'DOCUMENT', mime: 'text/vtt', ext: 'vtt' };
  if (buf.length < 12) return null;
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { kind: 'IMAGE', mime: 'image/jpeg', ext: 'jpg' };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return { kind: 'IMAGE', mime: 'image/png', ext: 'png' };
  if (ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 12) === 'WEBP')
    return { kind: 'IMAGE', mime: 'image/webp', ext: 'webp' };
  if (ascii(buf, 0, 6) === 'GIF87a' || ascii(buf, 0, 6) === 'GIF89a')
    return { kind: 'IMAGE', mime: 'image/gif', ext: 'gif' };
  if (ascii(buf, 0, 5) === '%PDF-') return { kind: 'PDF', mime: 'application/pdf', ext: 'pdf' };
  if (ascii(buf, 4, 8) === 'ftyp') {
    const brand = ascii(buf, 8, 12);
    if (brand === 'avif' || brand === 'avis')
      return { kind: 'IMAGE', mime: 'image/avif', ext: 'avif' };
    if (MP4_BRANDS.includes(brand)) return { kind: 'VIDEO', mime: 'video/mp4', ext: 'mp4' };
  }
  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3]))
    return { kind: 'VIDEO', mime: 'video/webm', ext: 'webm' };
  return null;
}

/** Strips paths, control characters and risky characters from a user filename (display only). */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file';
  const cleaned = base

    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 160);
  return cleaned || 'file';
}
