import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { requireStudio, jsonError } from "@/lib/session";
import { randomId } from "@/lib/slug";

export const runtime = "nodejs";
const MAX = 5 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

/** Images only, ≤ 5 MB, always re-encoded (strips metadata and anything that isn't pixels). */
export async function POST(req: Request) {
  const denied = await requireStudio();
  if (denied) return denied;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind") === "logo" ? "logo" : "photo";
  if (!(file instanceof File)) return jsonError("اختار صورة");
  if (!TYPES.has(file.type)) return jsonError("الملف لازم يكون صورة (JPG / PNG / WebP)");
  if (file.size > MAX) return jsonError("الصورة أكبر من 5 ميجا");
  let out: Buffer;
  try {
    const img = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 }).rotate();
    out = kind === "logo"
      ? await img.trim({ threshold: 12 }).resize({ width: 600, height: 600, fit: "inside", withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100 }).toBuffer()
      : await img.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  } catch {
    return jsonError("الصورة دي مش سليمة، جرّب صورة تانية");
  }
  const name = `demo-studio/${kind}-${randomId(10)}.webp`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(name, out, { access: "public", contentType: "image/webp", addRandomSuffix: false });
    return NextResponse.json({ url: blob.url });
  }
  if (process.env.VERCEL) return jsonError("رفع الصور محتاج BLOB_READ_WRITE_TOKEN", 500);
  // Local development fallback.
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  const file2 = path.join(dir, path.basename(name));
  await fs.writeFile(file2, out);
  return NextResponse.json({ url: `/uploads/${path.basename(name)}` });
}
