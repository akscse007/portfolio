import type { Readable } from 'node:stream';

export interface StoredObject {
  body: Readable;
  size: number;
}

export interface StorageDriver {
  readonly name: 'local' | 's3' | 'memory';
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  getBuffer(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** Short-lived URL for direct download (S3). Local storage returns null. */
  signedUrl(key: string, opts: { contentType: string; disposition: string }): Promise<string | null>;
  list(prefix?: string): Promise<string[]>;
}

/** Keys are generated server-side only: `<yyyy>/<mm>/<random>[.<variant>].<ext>` */
export const STORAGE_KEY_RE =
  /^[0-9]{4}\/[0-9]{2}\/[A-Za-z0-9_-]{16,64}(?:\.[a-z0-9]{1,16})?\.[a-z0-9]{2,5}$/;

export function assertValidKey(key: string) {
  if (!STORAGE_KEY_RE.test(key)) throw new Error(`Refusing unsafe storage key: ${key}`);
}
