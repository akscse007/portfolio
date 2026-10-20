'use client';

import { useEffect, useState } from 'react';
import { errorMessage, useAdmin } from '@/components/admin/AdminContext';
import { ConfirmDialog, StatusPill } from '@/components/admin/fields';

type M = {
  id: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  status: string;
  emailSent: boolean;
  emailError: string | null;
  createdAt: string;
};

export function Inbox({ initial, initialOpen }: { initial: M[]; initialOpen: string | null }) {
  const { api, toast } = useAdmin();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<'ALL' | 'NEW' | 'READ' | 'ARCHIVED' | 'SPAM'>('ALL');
  const [openId, setOpenId] = useState<string | null>(initialOpen);
  const [del, setDel] = useState<M | null>(null);
  const open = items.find((m) => m.id === openId) ?? null;

  const setStatus = async (m: M, status: string) => {
    try {
      await api(`/api/admin/messages/${m.id}`, { method: 'PATCH', body: { status } });
      setItems((xs) => xs.map((x) => (x.id === m.id ? { ...x, status } : x)));
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  useEffect(() => {
    if (open && open.status === 'NEW') void setStatus(open, 'READ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  const remove = async () => {
    if (!del) return;
    try {
      await api(`/api/admin/messages/${del.id}`, { method: 'DELETE' });
      setItems((xs) => xs.filter((x) => x.id !== del.id));
      if (openId === del.id) setOpenId(null);
      setDel(null);
      toast('Message deleted');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const shown = items.filter((m) => filter === 'ALL' || m.status === filter);

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <div>
        <div className="mb-3 flex flex-wrap gap-1" role="group" aria-label="Filter messages">
          {(['ALL', 'NEW', 'READ', 'ARCHIVED', 'SPAM'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className="chip"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f.toLowerCase()} {f !== 'ALL' && `· ${items.filter((m) => m.status === f).length}`}
            </button>
          ))}
        </div>
        <ul className="divide-y divide-line rounded-sm border border-line">
          {shown.length === 0 && (
            <li className="p-6 text-center text-sm text-muted">No messages.</li>
          )}
          {shown.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setOpenId(m.id)}
                aria-current={openId === m.id ? 'true' : undefined}
                className={`block w-full p-3 text-left hover:bg-surface ${openId === m.id ? 'bg-surface' : ''}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={`truncate text-sm ${m.status === 'NEW' ? 'font-semibold' : ''}`}>
                    {m.subject}
                  </span>
                  <StatusPill status={m.status} />
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted">
                  {m.name} · {new Date(m.createdAt).toLocaleString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        {open ? (
          <article className="rounded-sm border border-line p-5" aria-labelledby="msg-subject">
            <h2 id="msg-subject" className="font-display text-2xl font-semibold">
              {open.subject}
            </h2>
            <p className="mt-1 text-sm text-muted">
              From {open.name} &lt;
              <a
                href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.subject}`)}`}
                className="underline"
              >
                {open.email}
              </a>
              &gt; · {new Date(open.createdAt).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted">
              Email notification:{' '}
              {open.emailSent
                ? 'sent'
                : open.emailError
                  ? `failed (${open.emailError})`
                  : 'not sent'}
            </p>
            <div className="mt-5 whitespace-pre-wrap break-words rounded-sm bg-surface p-4 text-sm leading-relaxed">
              {open.body}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.subject}`)}`}
                className="btn-primary btn-sm"
              >
                Reply by email
              </a>
              {open.status !== 'ARCHIVED' && (
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => setStatus(open, 'ARCHIVED')}
                >
                  Archive
                </button>
              )}
              {open.status !== 'SPAM' ? (
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => setStatus(open, 'SPAM')}
                >
                  Mark spam
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => setStatus(open, 'READ')}
                >
                  Not spam
                </button>
              )}
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setStatus(open, 'NEW')}
              >
                Mark unread
              </button>
              <button type="button" className="btn-danger btn-sm" onClick={() => setDel(open)}>
                Delete
              </button>
            </div>
          </article>
        ) : (
          <p className="rounded-sm border border-dashed border-line p-10 text-center text-sm text-muted">
            Select a message to read it.
          </p>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(del)}
        title="Delete this message permanently?"
        danger
        confirmLabel="Delete"
        onCancel={() => setDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}
