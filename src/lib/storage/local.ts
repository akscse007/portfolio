import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertValidKey, type StorageDriver } from './types';

/**
 * Development storage on the local filesystem. Files live outside /public and are
 * only reachable through the access-checked /media route.
 */
export class LocalStorage implements StorageDriver {
  readonly name = 'local' as const;
  private root: string;

  constructor(root: string) {
    this.root = path.resolve(root, 'objects');
  }

  private resolve(key: string) {
    assertValidKey(key);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error('Path traversal blocked');
    return full;
  }

  async put(key: string, data: Buffer) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data, { flag: 'wx', mode: 0o640 });
  }

  async get(key: string) {
    const full = this.resolve(key);
    try {
      const s = await stat(full);
      if (!s.isFile()) return null;
      return { body: createReadStream(full), size: s.size };
    } catch {
      return null;
    }
  }

  async getBuffer(key: string) {
    try {
      return await readFile(this.resolve(key));
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }

  async exists(key: string) {
    try {
      return (await stat(this.resolve(key))).isFile();
    } catch {
      return false;
    }
  }

  async signedUrl() {
    return null;
  }

  async list(prefix = '') {
    const out: string[] = [];
    const walk = async (dir: string, rel: string) => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const r = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) await walk(path.join(dir, e.name), r);
        else if (r.startsWith(prefix)) out.push(r);
      }
    };
    await walk(this.root, '');
    return out;
  }
}
