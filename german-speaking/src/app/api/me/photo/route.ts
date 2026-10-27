import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { setPhoto } from "@/lib/auth/users";
import { discardPhoto, PHOTO_MAX_BYTES, sniffImage, storePhoto } from "@/lib/photo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Body: the cropped 256×256 image bytes.
export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (!bytes.length) return jsonError(400, "photo_empty", "No image received");
  if (bytes.length > PHOTO_MAX_BYTES) return jsonError(413, "photo_too_large", "Image too large");
  const type = sniffImage(bytes);
  if (!type) return jsonError(415, "photo_type", "Only JPG, PNG or WebP");
  try {
    const url = await storePhoto(user.id, bytes, type);
    await setPhoto(user.id, url);
    await discardPhoto(user.photo);
    return NextResponse.json({ photo: url });
  } catch (err) {
    console.error("[photo] upload failed:", err instanceof Error ? err.message : err);
    return jsonError(502, "photo_failed", "Could not save the photo");
  }
}

export async function DELETE() {
  const user = await currentUser();
  if (!user) return unauthorized();
  await setPhoto(user.id, null);
  await discardPhoto(user.photo);
  return NextResponse.json({ photo: null });
}
