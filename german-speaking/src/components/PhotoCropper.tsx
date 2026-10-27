"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUI } from "@/lib/client/ui";
import { Modal } from "./Modal";

// Circle crop with drag, zoom slider, mouse wheel and two-finger pinch (Chrome Android).
// Produces a 256×256 WebP (PNG where the browser can't encode WebP).

export const PHOTO_INPUT_MAX = 5 * 1024 * 1024;
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const OUT = 256;
const MAX_ZOOM = 4;

/** Check a picked file before cropping; returns an error key or null. */
export function checkPhotoFile(f: File): "autherr_photo_type" | "autherr_photo_size" | null {
  if (!PHOTO_ACCEPT.split(",").includes(f.type)) return "autherr_photo_type";
  if (f.size > PHOTO_INPUT_MAX) return "autherr_photo_size";
  return null;
}

interface View {
  zoom: number;
  x: number; // image centre offset from the stage centre, CSS px
  y: number;
}

export function PhotoCropper({ file, onCancel, onDone, busy }: { file: File; onCancel: () => void; onDone: (blob: Blob) => void; busy?: boolean }) {
  const { t } = useUI();
  const stageRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [size, setSize] = useState(280);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const [error, setError] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => setImg(im);
    im.onerror = () => setError(true);
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Scale at zoom 1 = the image just covers the circle.
  const base = img ? Math.max(size / img.naturalWidth, size / img.naturalHeight) : 1;

  const clamp = useCallback(
    (v: View): View => {
      if (!img) return v;
      const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom));
      const w = img.naturalWidth * base * zoom;
      const h = img.naturalHeight * base * zoom;
      const mx = Math.max(0, (w - size) / 2);
      const my = Math.max(0, (h - size) / 2);
      return { zoom, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
    },
    [img, base, size],
  );

  useEffect(() => setView((v) => clamp(v)), [clamp]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const zoom = pinch.current.zoom * (dist / Math.max(1, pinch.current.dist));
      setView((v) => clamp({ ...v, zoom }));
    } else if (pointers.current.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };
  const onWheel = (e: React.WheelEvent) => setView((v) => clamp({ ...v, zoom: v.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08) }));
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 10;
    const moves: Record<string, Partial<View>> = {
      ArrowLeft: { x: view.x - step },
      ArrowRight: { x: view.x + step },
      ArrowUp: { y: view.y - step },
      ArrowDown: { y: view.y + step },
      "+": { zoom: view.zoom * 1.1 },
      "=": { zoom: view.zoom * 1.1 },
      "-": { zoom: view.zoom / 1.1 },
    };
    if (moves[e.key]) {
      e.preventDefault();
      setView((v) => clamp({ ...v, ...moves[e.key] }));
    }
  };

  const save = () => {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    const k = OUT / size;
    const w = img.naturalWidth * base * view.zoom;
    const h = img.naturalHeight * base * view.zoom;
    ctx.drawImage(img, (size / 2 + view.x - w / 2) * k, (size / 2 + view.y - h / 2) * k, w * k, h * k);
    canvas.toBlob(
      (blob) => {
        if (blob && blob.type === "image/webp") return onDone(blob);
        canvas.toBlob((png) => (png ? onDone(png) : setError(true)), "image/png");
      },
      "image/webp",
      0.88,
    );
  };

  const w = img ? img.naturalWidth * base * view.zoom : 0;
  const h = img ? img.naturalHeight * base * view.zoom : 0;

  return (
    <Modal title={t("crop_title")} onClose={onCancel}>
      <p className="text-sm text-muted mb-3">{t("crop_hint")}</p>
      <div
        ref={stageRef}
        role="img"
        aria-label={t("crop_title")}
        tabIndex={0}
        className="relative mx-auto w-full max-w-[300px] aspect-square overflow-hidden rounded-2xl bg-surface-2 touch-none cursor-grab active:cursor-grabbing select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
      >
        {img && (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of the picked file
          <img
            src={img.src}
            alt=""
            draggable={false}
            className="absolute max-w-none pointer-events-none"
            style={{ width: w, height: h, left: size / 2 + view.x - w / 2, top: size / 2 + view.y - h / 2 }}
          />
        )}
        {/* Everything outside the circle is dimmed. */}
        <div className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)", border: "2px solid rgba(255,255,255,0.85)" }} />
      </div>
      <label className="flex items-center gap-3 mt-4 text-sm">
        <span className="shrink-0">{t("crop_zoom")}</span>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={view.zoom}
          onChange={(e) => setView((v) => clamp({ ...v, zoom: Number(e.target.value) }))}
          className="flex-1 accent-[var(--brand)]"
        />
      </label>
      {error && (
        <p role="alert" className="text-danger text-sm mt-3">
          {t("autherr_photo_type")}
        </p>
      )}
      <div className="flex gap-2 justify-end mt-5">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          {t("me_cancel")}
        </button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={!img || busy}>
          {busy ? t("crop_saving") : t("crop_save")}
        </button>
      </div>
    </Modal>
  );
}
