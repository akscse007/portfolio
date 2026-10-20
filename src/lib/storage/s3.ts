import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'node:stream';
import { assertValidKey, type StorageDriver } from './types';

export type S3Options = {
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
  signedUrlTtl: number;
};

/**
 * S3-compatible object storage (AWS S3, Cloudflare R2, MinIO, Backblaze B2 ...).
 * The bucket must be PRIVATE — access is granted per request by the /media route.
 */
export class S3Storage implements StorageDriver {
  readonly name = 's3' as const;
  private client: S3Client;

  constructor(private opts: S3Options) {
    this.client = new S3Client({
      region: opts.region || 'auto',
      endpoint: opts.endpoint,
      forcePathStyle: opts.forcePathStyle,
      credentials:
        opts.accessKeyId && opts.secretAccessKey
          ? { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey }
          : undefined,
    });
  }

  async put(key: string, data: Buffer, contentType: string) {
    assertValidKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.opts.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        CacheControl: 'private, max-age=0',
      }),
    );
  }

  async get(key: string) {
    assertValidKey(key);
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.opts.bucket, Key: key }),
      );
      if (!res.Body) return null;
      return { body: res.Body as Readable, size: Number(res.ContentLength ?? 0) };
    } catch {
      return null;
    }
  }

  async getBuffer(key: string) {
    const obj = await this.get(key);
    if (!obj) return null;
    const chunks: Buffer[] = [];
    for await (const chunk of obj.body) chunks.push(Buffer.from(chunk as Uint8Array));
    return Buffer.concat(chunks);
  }

  async delete(key: string) {
    assertValidKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.opts.bucket, Key: key }));
  }

  async exists(key: string) {
    assertValidKey(key);
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.opts.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async signedUrl(key: string, opts: { contentType: string; disposition: string }) {
    assertValidKey(key);
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.opts.bucket,
        Key: key,
        ResponseContentType: opts.contentType,
        ResponseContentDisposition: opts.disposition,
      }),
      { expiresIn: this.opts.signedUrlTtl },
    );
  }

  async list(prefix = '') {
    const out: string[] = [];
    let token: string | undefined;
    do {
      const res = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.opts.bucket,
          Prefix: prefix,
          ContinuationToken: token,
        }),
      );
      for (const o of res.Contents ?? []) if (o.Key) out.push(o.Key);
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return out;
  }
}
