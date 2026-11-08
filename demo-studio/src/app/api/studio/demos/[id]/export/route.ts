import { exportToken } from "@/lib/auth";
import { buildExportZip } from "@/lib/exportSite";
import { getDemo } from "@/lib/repo";
import { requireStudio, jsonError } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Download a zip of a static build of the real site. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireStudio();
  if (denied) return denied;
  const { id } = await params;
  const d = await getDemo(id);
  if (!d) return jsonError("النموذج مش موجود", 404);
  // Render from this deployment directly (not through the portfolio rewrite).
  const origin = new URL(req.url).origin;
  try {
    const zip = await buildExportZip(`${origin}/s/${d.slug}?export=${encodeURIComponent(await exportToken(d.slug))}`, origin, d.slug);
    return new Response(new Blob([zip as BlobPart]), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${d.slug}-site.zip"` } });
  } catch (e) {
    return jsonError(`التصدير فشل: ${(e as Error).message}`, 500);
  }
}
