'use client';

import { useState } from 'react';
import { errorMessage, useAdmin } from '@/components/admin/AdminContext';
import { Panel, TextField } from '@/components/admin/fields';

export function PasswordForm() {
  const { api, toast, setCsrf } = useAdmin();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const mismatch = confirm.length > 0 && next !== confirm;

  return (
    <Panel
      title="Change password"
      description="At least 12 characters mixing three of: lowercase, uppercase, digits, symbols. All other sessions are signed out."
    >
      <form
        className="grid gap-4 sm:grid-cols-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (mismatch) return;
          setBusy(true);
          try {
            const r = await api<{ csrfToken: string }>('/api/admin/account/password', {
              method: 'POST',
              body: { currentPassword: current, newPassword: next },
            });
            setCsrf(r.csrfToken);
            setCurrent('');
            setNext('');
            setConfirm('');
            toast('Password changed. Other sessions were signed out.');
          } catch (err) {
            toast(errorMessage(err), 'error');
          } finally {
            setBusy(false);
          }
        }}
      >
        <TextField
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={setCurrent}
          required
        />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={setNext}
          required
          minLength={12}
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          required
          error={mismatch ? 'Passwords do not match' : undefined}
        />
        <div className="sm:col-span-3">
          <button type="submit" className="btn-primary btn-sm" disabled={busy || mismatch}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </Panel>
  );
}
