import { getDemoBySlug, isPublic } from "@/lib/repo";
import { mockupSvg, renderPng } from "@/lib/og";
import { isStudio } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getDemoBySlug(slug);
  if (!d || (!isPublic(d) && !(await isStudio()))) return new Response("Not found", { status: 404 });
  const w = Number(new URL(req.url).searchParams.get("w")) || undefined;
  const png = renderPng(await mockupSvg(d.content, d.slug), w && w >= 200 && w <= 1080 ? w : undefined);
  const download = new URL(req.url).searchParams.get("download");
  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=600, s-maxage=86400, stale-while-revalidate=604800",
      ...(download ? { "content-disposition": `attachment; filename="${d.slug}-mockup.png"` } : {}),
    },
  });
}
