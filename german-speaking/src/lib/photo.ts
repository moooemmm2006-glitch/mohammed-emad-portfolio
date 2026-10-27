import { del, put } from "@vercel/blob";

// Profile photos arrive already cropped to 256×256 by the browser (WebP, or PNG where the browser
// can't encode WebP). Stored in Vercel Blob when it's connected, otherwise as a small data: URL in the DB.

export const PHOTO_MAX_BYTES = 600 * 1024;
const TYPES = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" } as const;
export type PhotoType = keyof typeof TYPES;

/** The real type from the file's first bytes (the Content-Type header is not trusted). */
export function sniffImage(b: Uint8Array): PhotoType | null {
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  return null;
}

export const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function storePhoto(userId: string, bytes: Uint8Array, type: PhotoType): Promise<string> {
  if (blobEnabled()) {
    const blob = await put(`avatars/${userId}.${TYPES[type]}`, Buffer.from(bytes), {
      access: "public",
      contentType: type,
      addRandomSuffix: true, // a new URL per upload, so caches never show the old photo
    });
    return blob.url;
  }
  return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
}

/** Remove an old photo from Blob storage (data: URLs need nothing). */
export async function discardPhoto(url: string | null | undefined) {
  if (!url || url.startsWith("data:") || !blobEnabled()) return;
  await del(url).catch((e) => console.warn("[photo] could not delete old blob:", e instanceof Error ? e.message : e));
}
