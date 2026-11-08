import { getDemoBySlug, isPublic } from "@/lib/repo";
import { ogSvg, renderPng } from "@/lib/og";
import { siteUrl } from "@/lib/owner";
import { isStudio } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getDemoBySlug(slug);
  if (!d || (!isPublic(d) && !(await isStudio()))) return new Response("Not found", { status: 404 });
  const host = new URL(siteUrl()).host;
  const png = renderPng(await ogSvg(d.content, d.slug, `${host}/demo/${d.slug}`));
  return new Response(new Uint8Array(png), {
    headers: { "content-type": "image/png", "cache-control": "public, max-age=600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
