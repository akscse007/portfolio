'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { errorMessage, useAdmin } from '@/components/admin/AdminContext';
import {
  ConfirmDialog,
  Panel,
  SaveBar,
  TextArea,
  TextField,
  Toggle,
} from '@/components/admin/fields';
import { MediaSlot } from '@/components/admin/MediaPicker';
import type { GalleryItem } from '@/components/admin/GalleryEditor';

type F = {
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  defaultOg: GalleryItem | null;
  twitterHandle: string;
  contactEnabled: boolean;
  contactAutoReply: boolean;
  footerNote: string;
  analyticsNote: string;
};

export function SettingsForm({
  initial,
  sessions,
  environment,
  audit,
}: {
  initial: F;
  sessions: number;
  environment: { storage: string; email: string; csp: string; contactTo: boolean };
  audit: { id: string; action: string; entityType: string; createdAt: string }[];
}) {
  const { api, toast } = useAdmin();
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof F>(k: K, v: F[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api('/api/admin/settings', {
        method: 'PUT',
        body: { ...f, defaultOgMediaId: f.defaultOg?.id ?? null },
      });
      toast('Settings saved');
      router.refresh();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Site & SEO">
          <TextField label="Site title" value={f.siteTitle} onChange={(v) => set('siteTitle', v)} />
          <TextArea
            label="Default description"
            value={f.siteDescription}
            rows={3}
            onChange={(v) => set('siteDescription', v)}
          />
          <TextField
            label="Public site URL"
            type="url"
            value={f.siteUrl}
            onChange={(v) => set('siteUrl', v)}
            hint="Canonical URLs use the SITE_URL environment variable."
          />
          <TextField
            label="X / Twitter handle"
            value={f.twitterHandle}
            onChange={(v) => set('twitterHandle', v)}
          />
          <MediaSlot
            label="Default social image (optional)"
            value={f.defaultOg}
            onChange={(m) => set('defaultOg', m)}
            hint="1200×630 recommended. A generated image is used when empty."
          />
          <TextField
            label="Footer note"
            value={f.footerNote}
            onChange={(v) => set('footerNote', v)}
          />
        </Panel>
        <div className="grid content-start gap-6">
          <Panel title="Contact form">
            <Toggle
              label="Contact form enabled"
              checked={f.contactEnabled}
              onChange={(v) => set('contactEnabled', v)}
            />
            <p className="text-xs text-muted">
              Email delivery: <strong>{environment.email}</strong>
              {environment.contactTo
                ? ''
                : ' · CONTACT_TO is not set, so no notification emails are sent (messages are still stored).'}
            </p>
          </Panel>
          <Panel title="Security">
            <p className="text-sm">
              Active sessions for your account: <strong>{sessions}</strong>
            </p>
            <p className="text-xs text-muted">
              Storage driver: {environment.storage} · CSP mode: {environment.csp}
            </p>
            <button
              type="button"
              className="btn-danger btn-sm justify-self-start"
              onClick={() => setConfirm(true)}
            >
              Sign out everywhere
            </button>
          </Panel>
          <Panel title="Recent activity">
            <ul className="space-y-1 text-xs">
              {audit.map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <span>
                    {a.entityType} · <span className="text-accent">{a.action}</span>
                  </span>
                  <span className="text-muted">{new Date(a.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
      <SaveBar status={saving ? 'Saving…' : ''}>
        <button type="button" className="btn-primary btn-sm" onClick={save} disabled={saving}>
          Save settings
        </button>
      </SaveBar>
      <ConfirmDialog
        open={confirm}
        title="Sign out of every session?"
        confirmLabel="Sign out everywhere"
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          try {
            await api('/api/auth/logout?all=1', { method: 'POST' });
            window.location.href = '/admin/login';
          } catch (e) {
            toast(errorMessage(e), 'error');
          }
        }}
      >
        You will need to sign in again on this device too.
      </ConfirmDialog>
    </div>
  );
}
