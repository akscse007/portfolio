import { LocalStorage } from './local';
import { S3Storage } from './s3';
import type { StorageDriver } from './types';

let driver: StorageDriver | null = null;

/** Resolves the configured storage driver (local filesystem in development, S3 in production). */
export function storage(): StorageDriver {
  if (driver) return driver;
  const kind = process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local';
  if (kind === 's3') {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) throw new Error('S3_BUCKET is required when STORAGE_DRIVER=s3');
    driver = new S3Storage({
      bucket,
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT || undefined,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      signedUrlTtl: Number(process.env.S3_SIGNED_URL_TTL || 300),
    });
  } else {
    driver = new LocalStorage(process.env.LOCAL_STORAGE_DIR || './storage');
  }
  return driver;
}

export function setStorageForTests(d: StorageDriver | null) {
  driver = d;
}

export type { StorageDriver } from './types';
