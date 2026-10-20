'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type LightboxItem = {
  id: string;
  kind: 'IMAGE' | 'PDF';
  /** display-size image or PDF URL */
  src: string;
  /** full-resolution original, when the owner allows it */
  original?: string | null;
  alt: string;
  title?: string;
  caption?: string | null;
  href?: string;
  hrefLabel?: string;
  width?: number | null;
  height?: number | null;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

/**
 * Accessible full-screen viewer for certificates, photos and documents.
 * Keyboard: ←/→ navigate · +/− zoom · 0 fit · Esc close. Touch: swipe to navigate,
 * pinch or double-tap to zoom, drag to pan. Only the current (and adjacent) display
 * variants are loaded; originals load on request.
 */
export function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
  label = 'Media viewer',
}: {
  items: LightboxItem[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  label?: string;
}) {
  const open = index !== null && index >= 0 && index < items.length;
  const item = open ? items[index] : null;
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showOriginal, setShowOriginal] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    startDist: number;
    startZoom: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);
  const lastTap = useRef(0);

  useEffect(() => setMounted(true), []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetView();
    setShowOriginal(false);
    setLoaded(false);
    setFailed(false);
  }, [index, resetView]);

  const go = useCallback(
    (delta: number) => {
      if (!open || items.length < 2) return;
      onIndexChange((index! + delta + items.length) % items.length);
    },
    [open, index, items.length, onIndexChange],
  );

  const zoomBy = useCallback((factor: number) => {
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Focus management + scroll lock
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = 'hidden';
    const t = window.setTimeout(
      () => dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(),
      30,
    );
    return () => {
      window.clearTimeout(t);
      root.style.overflow = prev;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      } else if (e.key === '+' || e.key === '=') {
        zoomBy(1.4);
      } else if (e.key === '-' || e.key === '_') {
        zoomBy(1 / 1.4);
      } else if (e.key === '0') {
        resetView();
      } else if (e.key === 'Tab') {
        const nodes = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        );
        if (!nodes.length) return;
        const first = nodes[0]!;
        const last = nodes[nodes.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, go, onClose, zoomBy, resetView]);

  // Preload neighbours (display size only)
  useEffect(() => {
    if (!open || items.length < 2) return;
    [index! + 1, index! - 1].forEach((i) => {
      const n = items[(i + items.length) % items.length];
      if (n?.kind === 'IMAGE') {
        const img = new Image();
        img.src = n.src;
      }
    });
  }, [open, index, items]);

  // Pointer gestures: pinch-zoom, pan, swipe, double-tap
  const onPointerDown = (e: React.PointerEvent) => {
    if (item?.kind !== 'IMAGE') return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointers.current.values());
    gesture.current = {
      startDist: pts.length === 2 ? Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) : 0,
      startZoom: zoom,
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!gesture.current || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointers.current.values());
    const g = gesture.current;
    if (pts.length === 2 && g.startDist > 0) {
      const d = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, g.startZoom * (d / g.startDist))));
      g.moved = true;
      return;
    }
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) g.moved = true;
    if (zoom > 1) setPan({ x: g.panX + dx, y: g.panY + dy });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    if (!g || !wasSingle) return;
    const dx = e.clientX - g.startX;
    if (zoom === 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - g.startY)) {
      go(dx < 0 ? 1 : -1);
    } else if (!g.moved) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        if (zoom > 1) resetView();
        else setZoom(2.2);
        lastTap.current = 0;
      } else lastTap.current = now;
    }
    gesture.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    if (item?.kind !== 'IMAGE') return;
    if (e.ctrlKey || e.metaKey || zoom > 1) {
      zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && item && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-[90] flex flex-col bg-[rgb(8_9_7/0.96)] text-[rgb(237_234_226)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          data-testid="lightbox"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-5">
            <div className="min-w-0">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[rgb(158_155_145)]">
                {label} · {index! + 1} / {items.length}
              </p>
              <h2 id={titleId} className="truncate text-sm font-semibold sm:text-base">
                {item.title ?? item.alt}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {item.kind === 'IMAGE' && (
                <>
                  <IconButton
                    label="Zoom out"
                    onClick={() => zoomBy(1 / 1.4)}
                    disabled={zoom <= MIN_ZOOM}
                  >
                    −
                  </IconButton>
                  <span
                    className="hidden w-12 text-center font-mono text-xs tabular-nums sm:inline"
                    aria-live="polite"
                  >
                    {Math.round(zoom * 100)}%
                  </span>
                  <IconButton
                    label="Zoom in"
                    onClick={() => zoomBy(1.4)}
                    disabled={zoom >= MAX_ZOOM}
                  >
                    +
                  </IconButton>
                  <IconButton label="Fit to screen" onClick={resetView} disabled={zoom === 1}>
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      aria-hidden
                    >
                      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                    </svg>
                  </IconButton>
                </>
              )}
              <IconButton label="Close viewer (Escape)" onClick={onClose} autoFocus>
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden
                >
                  <path d="M5 5l14 14M19 5L5 19" />
                </svg>
              </IconButton>
            </div>
          </div>

          {/* Stage */}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {item.kind === 'IMAGE' ? (
              <div
                className={cn(
                  'flex h-full w-full touch-none select-none items-center justify-center p-2 sm:p-8',
                  zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in',
                )}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onWheel={onWheel}
              >
                {!loaded && !failed && (
                  <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
                    <span className="h-10 w-10 animate-spin rounded-full border-2 border-[rgb(52_54_46)] border-t-[rgb(198_244_50)]" />
                  </div>
                )}
                {failed ? (
                  <p className="max-w-sm text-center text-sm text-[rgb(158_155_145)]">
                    This image could not be loaded. Check your connection and try again.
                  </p>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${item.id}-${showOriginal ? 'o' : 'd'}`}
                    src={showOriginal && item.original ? item.original : item.src}
                    alt={item.alt}
                    draggable={false}
                    onLoad={() => setLoaded(true)}
                    onError={() => setFailed(true)}
                    className={cn(
                      'max-h-full max-w-full object-contain transition-opacity duration-300',
                      loaded ? 'opacity-100' : 'opacity-0',
                    )}
                    style={{
                      transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                      transition: gesture.current
                        ? 'none'
                        : 'transform 220ms cubic-bezier(0.16,1,0.3,1), opacity 300ms',
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-3 sm:p-8">
                <iframe
                  src={`${item.src}#view=FitH`}
                  title={item.alt}
                  className="hidden h-full w-full max-w-5xl rounded-sm bg-white md:block"
                />
                <div className="flex flex-col items-center gap-3 text-center md:hidden">
                  <p className="max-w-xs text-sm text-[rgb(158_155_145)]">
                    PDF documents open in your device&rsquo;s full-screen viewer.
                  </p>
                  <a
                    href={item.src}
                    target="_blank"
                    rel="noopener"
                    className="btn bg-[rgb(198_244_50)] text-[rgb(14_15_12)]"
                  >
                    Open document
                  </a>
                </div>
              </div>
            )}

            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[rgb(22_23_19/0.8)] hover:bg-[rgb(31_32_27)] sm:flex"
                  aria-label="Previous item"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[rgb(22_23_19/0.8)] hover:bg-[rgb(31_32_27)] sm:flex"
                  aria-label="Next item"
                >
                  →
                </button>
              </>
            )}
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col gap-3 border-t border-[rgb(52_54_46)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="line-clamp-2 text-sm text-[rgb(200_197_188)]">
              {item.caption ?? item.alt}
            </p>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {items.length > 1 && (
                <div className="flex gap-2 sm:hidden">
                  <IconButton label="Previous item" onClick={() => go(-1)}>
                    ←
                  </IconButton>
                  <IconButton label="Next item" onClick={() => go(1)}>
                    →
                  </IconButton>
                </div>
              )}
              {item.kind === 'IMAGE' && item.original && !showOriginal && (
                <button
                  type="button"
                  onClick={() => setShowOriginal(true)}
                  className="btn btn-sm border border-[rgb(52_54_46)]"
                >
                  Load full resolution
                </button>
              )}
              {item.kind === 'PDF' && (
                <a
                  href={item.src}
                  target="_blank"
                  rel="noopener"
                  className="btn btn-sm border border-[rgb(52_54_46)]"
                >
                  Open in new tab
                </a>
              )}
              {item.href && (
                <Link
                  href={item.href}
                  className="btn btn-sm bg-[rgb(198_244_50)] text-[rgb(14_15_12)]"
                  onClick={onClose}
                >
                  {item.hrefLabel ?? 'Details'} →
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function IconButton({
  label,
  onClick,
  children,
  disabled,
  autoFocus,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      data-autofocus={autoFocus ? '' : undefined}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-lg hover:bg-[rgb(31_32_27)] disabled:opacity-30"
    >
      {children}
    </button>
  );
}
