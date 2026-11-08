"use client";
import { paletteFromColors, quantize } from "@/lib/palette";

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("الصورة دي مش سليمة")); };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, q: number): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("مقدرناش نضغط الصورة"))), "image/webp", q));
}

/** Resize + WebP until it fits in maxBytes (default 300 KB). */
export async function compressImage(file: File, maxBytes = 300 * 1024, maxDim = 1600): Promise<Blob> {
  const img = await loadImage(file);
  let dim = maxDim;
  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, dim / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    for (const q of [0.82, 0.72, 0.6, 0.5]) {
      const b = await toBlob(c, q);
      if (b.size <= maxBytes) return b;
    }
    dim = Math.round(dim * 0.75);
  }
  throw new Error("الصورة كبيرة قوي، جرّب صورة أصغر");
}

/**
 * Logo: trim transparent / near-white margins on a canvas, and extract a palette
 * (colour quantisation over the remaining pixels).
 */
export async function prepareLogo(file: File): Promise<{ blob: Blob; palette: { primary: string; accent: string } | null; colors: string[] }> {
  const img = await loadImage(file);
  const scale = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let top = h, left = w, right = -1, bottom = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const blank = data[i + 3] < 16 || (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245);
    if (!blank) { if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y; }
  }
  let out = c;
  if (right >= left && bottom >= top) {
    const pad = Math.round(Math.max(right - left, bottom - top) * 0.04);
    const x0 = Math.max(0, left - pad), y0 = Math.max(0, top - pad);
    const tw = Math.min(w, right + pad + 1) - x0, th = Math.min(h, bottom + pad + 1) - y0;
    out = document.createElement("canvas");
    out.width = tw; out.height = th;
    out.getContext("2d")!.drawImage(c, x0, y0, tw, th, 0, 0, tw, th);
  }
  const colors = quantize(data, 6);
  const blob = await toBlob(out, 0.92);
  return { blob, palette: paletteFromColors(colors), colors };
}

export async function uploadImage(blob: Blob, kind: "logo" | "photo"): Promise<string> {
  const fd = new FormData();
  fd.append("file", new File([blob], `${kind}.webp`, { type: "image/webp" }));
  fd.append("kind", kind);
  const res = await fetch("/api/studio/upload", { method: "POST", body: fd });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "الرفع فشل");
  return j.url as string;
}
