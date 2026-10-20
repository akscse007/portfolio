'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { errorMessage, useAdmin, type UploadedMedia } from '@/components/admin/AdminContext';
import { Uploader } from '@/components/admin/Uploader';
import { MediaPicker, MediaThumb } from '@/components/admin/MediaPicker';
import { CropTool } from '@/components/admin/CropTool';
import { renderPdfFirstPage } from '@/components/admin/pdfPreview';
import { ConfirmDialog } from '@/components/admin/fields';
import { formatBytes } from '@/lib/utils';

export type AssetRow = {
  id: string;
  role: 'CERTIFICATE' | 'PREVIEW' | 'PHOTO' | 'GALLERY';
  order: number;
  media: Pick<
    UploadedMedia,
    | 'id'
    | 'kind'
    | 'alt'
    | 'originalName'
    | 'mimeType'
    | 'visibility'
    | 'sizeBytes'
    | 'width'
    | 'height'
  >;
};

const ROLE_INFO: Record<AssetRow['role'], { title: string; help: string }> = {
  CERTIFICATE: {
    title: 'Original certificate',
    help: 'The untouched original (image or PDF). Stays PRIVATE unless “Original document is public” is enabled on a published record.',
  },
  PREVIEW: {
    title: 'Public preview',
    help: 'What visitors see. Becomes PUBLIC only when the record is published AND “Preview approved” is on. Crop out personal identifiers first.',
  },
  PHOTO: {
    title: 'Award / event photographs',
    help: 'Shown with a separate photographic treatment once the preview is approved.',
  },
  GALLERY: {
    title: 'Additional gallery images',
    help: 'Extra images (e.g. event moments). Same approval rule as photos.',
  },
};

export function AssetsManager({
  achievementId,
  assets: initial,
}: {
  achievementId: string;
  assets: AssetRow[];
}) {
  const { api, toast, upload } = useAdmin();
  const router = useRouter();
  const [assets, setAssets] = useState(initial);
  const [cropFor, setCropFor] = useState<AssetRow | null>(null);
  const [replaceFor, setReplaceFor] = useState<AssetRow | null>(null);
  const [detach, setDetach] = useState<AssetRow | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const r = await api<{ achievement: { assets: AssetRow[] } }>(
      `/api/admin/achievements/${achievementId}`,
    );
    setAssets(r.achievement.assets);
    router.refresh();
  };

  const attach = async (mediaId: string, role: AssetRow['role']) => {
    try {
      await api(`/api/admin/achievements/${achievementId}/assets`, {
        method: 'POST',
        body: { mediaId, role },
      });
      await refresh();
      toast(`${ROLE_INFO[role].title} attached`);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const crop = async (box: { x: number; y: number; width: number; height: number }) => {
    if (!cropFor) return;
    setBusy(true);
    try {
      await api(`/api/admin/achievements/${achievementId}/crop`, {
        method: 'POST',
        body: { mediaId: cropFor.media.id, ...box },
      });
      await refresh();
      setCropFor(null);
      toast('Preview created from the selection — original unchanged');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  /** Renders page 1 of the private PDF in this browser (pdf.js) and attaches it as the preview. */
  const regenerateFromPdf = async (a: AssetRow) => {
    setBusy(true);
    try {
      const res = await fetch(`/media/${a.media.id}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Could not load the PDF');
      const png = await renderPdfFirstPage(await res.blob());
      if (!png) throw new Error('This PDF could not be rendered in the browser');
      const named = Object.assign(png, {
        name: a.media.originalName.replace(/\.pdf$/i, '') + '-page1.png',
      });
      const preview = await upload(named, {
        accept: ['IMAGE'],
        derivedFromId: a.media.id,
        alt: a.media.alt,
      });
      await attach(preview.id, 'PREVIEW');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const reorder = async (role: AssetRow['role'], id: string, d: -1 | 1) => {
    const list = assets.filter((a) => a.role === role).sort((a, b) => a.order - b.order);
    const i = list.findIndex((a) => a.id === id);
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j]!, list[i]!];
    try {
      await api(`/api/admin/achievements/${achievementId}/assets`, {
        method: 'PUT',
        body: { ids: list.map((a) => a.id) },
      });
      await refresh();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const doDetach = async () => {
    if (!detach) return;
    setBusy(true);
    try {
      await api(`/api/admin/achievements/${achievementId}/assets?assetId=${detach.id}`, {
        method: 'DELETE',
      });
      await refresh();
      setDetach(null);
      toast('Detached — the file remains in the media library');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const role = (r: AssetRow['role']) =>
    assets.filter((a) => a.role === r).sort((a, b) => a.order - b.order);
  const certificate = role('CERTIFICATE')[0];

  return (
    <div className="grid gap-6">
      {(['CERTIFICATE', 'PREVIEW', 'PHOTO', 'GALLERY'] as const).map((r) => (
        <section
          key={r}
          className="rounded-sm border border-line p-4"
          aria-labelledby={`role-${r}`}
        >
          <h3 id={`role-${r}`} className="font-semibold">
            {ROLE_INFO[r].title}
          </h3>
          <p className="mt-1 text-xs text-muted">{ROLE_INFO[r].help}</p>
          {role(r).length > 0 && (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {role(r).map((a, i, list) => (
                <li key={a.id} className="flex gap-3 rounded-sm border border-line p-2">
                  <a
                    href={`/media/${a.media.id}${a.media.kind === 'IMAGE' ? '?v=display' : ''}`}
                    target="_blank"
                    rel="noopener"
                    className="block h-24 w-28 shrink-0 overflow-hidden rounded-xs bg-bg"
                    title="Open (admin only while private)"
                  >
                    <MediaThumb media={a.media} />
                  </a>
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="truncate font-medium">{a.media.originalName}</p>
                    <p className="text-muted">
                      {a.media.kind} · {formatBytes(a.media.sizeBytes)}
                      {a.media.width ? ` · ${a.media.width}×${a.media.height}` : ''}
                    </p>
                    <p
                      className={`mt-1 inline-block rounded-full border px-2 font-mono text-[0.6rem] uppercase ${a.media.visibility === 'PUBLIC' ? 'border-accent/60 text-accent' : 'border-line text-muted'}`}
                    >
                      {a.media.visibility}
                    </p>
                    {!a.media.alt && a.media.kind === 'IMAGE' && (
                      <p className="mt-1 text-danger">Missing alt text — add it in Media.</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r === 'CERTIFICATE' && a.media.kind === 'IMAGE' && (
                        <button
                          type="button"
                          className="btn-ghost btn-sm min-h-8"
                          onClick={() => setCropFor(a)}
                        >
                          Crop → preview
                        </button>
                      )}
                      {r === 'CERTIFICATE' && a.media.kind === 'PDF' && (
                        <button
                          type="button"
                          className="btn-ghost btn-sm min-h-8"
                          disabled={busy}
                          onClick={() => regenerateFromPdf(a)}
                        >
                          {busy ? 'Rendering…' : 'Regenerate preview from PDF'}
                        </button>
                      )}
                      {(r === 'PHOTO' || r === 'GALLERY') && list.length > 1 && (
                        <>
                          <button
                            type="button"
                            className="btn-ghost btn-sm min-h-8 px-2"
                            aria-label="Move earlier"
                            onClick={() => reorder(r, a.id, -1)}
                            disabled={i === 0}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="btn-ghost btn-sm min-h-8 px-2"
                            aria-label="Move later"
                            onClick={() => reorder(r, a.id, 1)}
                            disabled={i === list.length - 1}
                          >
                            ↓
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn-ghost btn-sm min-h-8"
                        onClick={() => setReplaceFor(a)}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        className="btn-ghost btn-sm min-h-8 text-danger"
                        onClick={() => setDetach(a)}
                      >
                        Detach
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {(r === 'PHOTO' || r === 'GALLERY' || role(r).length === 0) && (
            <div className="mt-4">
              <Uploader
                compact
                accept={r === 'CERTIFICATE' ? ['IMAGE', 'PDF'] : ['IMAGE']}
                multiple={r === 'PHOTO' || r === 'GALLERY'}
                label={
                  r === 'CERTIFICATE'
                    ? 'Upload the original certificate (image or PDF)'
                    : 'Upload images'
                }
                onUploaded={async (media, extra) => {
                  await attach(media.id, r);
                  // A PDF's rendered first page becomes the (still private) preview candidate.
                  if (r === 'CERTIFICATE' && extra?.preview && role('PREVIEW').length === 0)
                    await attach(extra.preview.id, 'PREVIEW');
                }}
              />
            </div>
          )}
          {r === 'PREVIEW' &&
            role('PREVIEW').length === 0 &&
            certificate?.media.kind === 'IMAGE' && (
              <button
                type="button"
                className="btn-ghost btn-sm mt-3"
                onClick={() => setCropFor(certificate)}
              >
                Create preview from the original
              </button>
            )}
        </section>
      ))}

      {cropFor && (
        <section className="rounded-sm border border-accent/50 p-4" aria-labelledby="crop-h">
          <div className="mb-3 flex items-center justify-between">
            <h3 id="crop-h" className="font-semibold">
              Crop public preview
            </h3>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setCropFor(null)}>
              Cancel
            </button>
          </div>
          <CropTool
            src={`/media/${cropFor.media.id}?v=display`}
            alt={cropFor.media.alt || cropFor.media.originalName}
            onCrop={crop}
            busy={busy}
          />
        </section>
      )}

      <MediaPicker
        open={Boolean(replaceFor)}
        onClose={() => setReplaceFor(null)}
        kinds={replaceFor?.role === 'CERTIFICATE' ? ['IMAGE', 'PDF'] : ['IMAGE']}
        title="Choose replacement"
        onSelect={async (items) => {
          const m = items[0];
          if (!m || !replaceFor) return;
          try {
            await api(`/api/admin/achievements/${achievementId}/assets`, {
              method: 'PUT',
              body: { assetId: replaceFor.id, mediaId: m.id },
            });
            await refresh();
            toast('Replaced — alt text and caption carried over where missing');
          } catch (e) {
            toast(errorMessage(e), 'error');
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(detach)}
        title="Detach this file?"
        confirmLabel="Detach"
        onCancel={() => setDetach(null)}
        onConfirm={doDetach}
        busy={busy}
      >
        The file stays in the media library (private unless used elsewhere). You can delete it
        there.
      </ConfirmDialog>
    </div>
  );
}
