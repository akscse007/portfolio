'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { errorMessage, useAdmin } from '@/components/admin/AdminContext';
import {
  MarkdownField,
  Panel,
  SaveBar,
  TagInput,
  TextArea,
  TextField,
  Toggle,
} from '@/components/admin/fields';
import { MediaSlot } from '@/components/admin/MediaPicker';
import type { GalleryItem } from '@/components/admin/GalleryEditor';

type F = {
  name: string;
  headline: string;
  tagline: string;
  subTagline: string;
  location: string;
  timezone: string;
  shortBio: string;
  bio: string;
  researchInterests: string[];
  email: string;
  githubUrl: string;
  linkedinUrl: string;
  cv: GalleryItem | null;
  cvUrl: string;
  portrait: GalleryItem | null;
  availabilityOn: boolean;
  availabilityLabel: string;
  showClock: boolean;
};

export function ProfileForm({ initial }: { initial: F }) {
  const { api, toast } = useAdmin();
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof F>(k: K, v: F[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api('/api/admin/profile', {
        method: 'PUT',
        body: { ...f, cvMediaId: f.cv?.id ?? null, portraitMediaId: f.portrait?.id ?? null },
      });
      toast('Profile saved');
      router.refresh();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="grid gap-6"
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Identity">
          <TextField label="Name" value={f.name} onChange={(v) => set('name', v)} />
          <TextField
            label="Professional headline"
            value={f.headline}
            onChange={(v) => set('headline', v)}
          />
          <TextField
            label="Tagline (hero, screen readers)"
            value={f.tagline}
            onChange={(v) => set('tagline', v)}
          />
          <TextField
            label="Supporting line"
            value={f.subTagline}
            onChange={(v) => set('subTagline', v)}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Location" value={f.location} onChange={(v) => set('location', v)} />
            <TextField
              label="Time zone (IANA)"
              value={f.timezone}
              onChange={(v) => set('timezone', v)}
              hint="e.g. Asia/Kolkata"
            />
          </div>
          <Toggle
            label="Show live local clock"
            checked={f.showClock}
            onChange={(v) => set('showClock', v)}
          />
          <Toggle
            label="Show availability indicator"
            hint="Only turn this on when it is true."
            checked={f.availabilityOn}
            onChange={(v) => set('availabilityOn', v)}
          />
          {f.availabilityOn && (
            <TextField
              label="Availability text"
              value={f.availabilityLabel}
              onChange={(v) => set('availabilityLabel', v)}
              hint="e.g. “Open to research internships”"
            />
          )}
        </Panel>
        <Panel title="Links & documents">
          <TextField
            label="Public email"
            type="email"
            value={f.email}
            onChange={(v) => set('email', v)}
          />
          <TextField
            label="GitHub URL"
            type="url"
            value={f.githubUrl}
            onChange={(v) => set('githubUrl', v)}
          />
          <TextField
            label="LinkedIn URL"
            type="url"
            value={f.linkedinUrl}
            onChange={(v) => set('linkedinUrl', v)}
          />
          <MediaSlot
            label="CV (PDF)"
            kinds={['PDF']}
            value={f.cv}
            onChange={(m) => set('cv', m)}
            hint="Becomes public once selected here. Remove phone numbers you don't want published."
          />
          <TextField
            label="…or external CV URL"
            type="url"
            value={f.cvUrl}
            onChange={(v) => set('cvUrl', v)}
            hint="Used only when no PDF is selected."
          />
          <MediaSlot
            label="Portrait (optional)"
            value={f.portrait}
            onChange={(m) => set('portrait', m)}
          />
        </Panel>
      </div>
      <Panel title="Biography">
        <TextArea
          label="Short bio"
          value={f.shortBio}
          rows={3}
          onChange={(v) => set('shortBio', v)}
          hint="Used in meta descriptions and page intros."
        />
        <MarkdownField
          label="Full biography"
          value={f.bio}
          onChange={(v) => set('bio', v)}
          rows={10}
        />
        <TagInput
          label="Research interests"
          value={f.researchInterests}
          onChange={(v) => set('researchInterests', v)}
        />
      </Panel>
      <SaveBar status={saving ? 'Saving…' : ''}>
        <button type="submit" className="btn-primary btn-sm" disabled={saving}>
          Save profile
        </button>
      </SaveBar>
    </form>
  );
}
