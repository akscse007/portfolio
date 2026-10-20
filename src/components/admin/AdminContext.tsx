'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: { path: string; message: string }[] | { usage?: { label: string }[] },
  ) {
    super(message);
  }
}

export type UploadedMedia = {
  id: string;
  kind: 'IMAGE' | 'PDF' | 'VIDEO' | 'DOCUMENT';
  mimeType: string;
  originalName: string;
  alt: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  visibility: 'PUBLIC' | 'PRIVATE';
  createdAt: string;
  derivedFromId: string | null;
};

type Toast = { id: number; kind: 'ok' | 'error' | 'info'; text: string };

type Ctx = {
  csrf: string;
  setCsrf: (t: string) => void;
  api: <T = unknown>(url: string, opts?: { method?: string; body?: unknown }) => Promise<T>;
  upload: (
    file: Blob & { name?: string },
    opts?: {
      accept?: string[];
      alt?: string;
      derivedFromId?: string;
      onProgress?: (pct: number) => void;
    },
  ) => Promise<UploadedMedia>;
  toast: (text: string, kind?: Toast['kind']) => void;
};

const AdminCtx = createContext<Ctx | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>');
  return ctx;
}

export function AdminProvider({ csrfToken, children }: { csrfToken: string; children: ReactNode }) {
  const [csrf, setCsrf] = useState(csrfToken);
  const csrfRef = useRef(csrf);
  csrfRef.current = csrf;
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    window.setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      kind === 'error' ? 7000 : 3500,
    );
  }, []);

  const api = useCallback(
    async <T,>(url: string, opts: { method?: string; body?: unknown } = {}) => {
      const res = await fetch(url, {
        method: opts.method ?? 'GET',
        headers: {
          ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          'X-CSRF-Token': csrfRef.current,
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (res.status === 401) {
        window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
        throw new ApiError('Session expired', 401);
      }
      if (!res.ok)
        throw new ApiError(
          String(data.error ?? `Request failed (${res.status})`),
          res.status,
          data.details as never,
        );
      return data as T;
    },
    [],
  );

  const upload = useCallback<Ctx['upload']>((file, opts = {}) => {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', file, file.name ?? 'upload');
      if (opts.accept?.length) form.append('accept', opts.accept.join(','));
      if (opts.alt) form.append('alt', opts.alt);
      if (opts.derivedFromId) form.append('derivedFromId', opts.derivedFromId);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/admin/media');
      xhr.setRequestHeader('X-CSRF-Token', csrfRef.current);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let data: { media?: UploadedMedia; error?: string } = {};
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          /* ignore */
        }
        if (xhr.status >= 200 && xhr.status < 300 && data.media) resolve(data.media);
        else reject(new ApiError(data.error ?? `Upload failed (${xhr.status})`, xhr.status));
      };
      xhr.onerror = () => reject(new ApiError('Network error during upload', 0));
      xhr.send(form);
    });
  }, []);

  const value = useMemo(() => ({ csrf, setCsrf, api, upload, toast }), [csrf, api, upload, toast]);

  return (
    <AdminCtx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[95] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto rounded-sm border px-4 py-3 text-sm shadow-lift animate-fade-up ${
              t.kind === 'error'
                ? 'border-danger/60 bg-elevated text-danger'
                : t.kind === 'info'
                  ? 'border-blue/50 bg-elevated text-fg'
                  : 'border-accent/50 bg-elevated text-fg'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </AdminCtx.Provider>
  );
}

export function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (Array.isArray(err.details) && err.details.length)
      return `${err.message}: ${err.details.map((d) => `${d.path || 'field'} — ${d.message}`).join('; ')}`;
    return err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}
