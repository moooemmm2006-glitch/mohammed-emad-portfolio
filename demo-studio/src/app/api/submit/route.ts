import { NextResponse, after } from "next/server";
import { z } from "zod";
import { sha256 } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { getDemoBySlug, rateLimit } from "@/lib/repo";
import { clientIp, jsonError } from "@/lib/session";

/** Real-site form: stored in the DB and forwarded to the optional webhook (Google Sheets via n8n). */
const Body = z.object({
  slug: z.string().min(1).max(60),
  fields: z.record(z.string().max(60), z.string().max(300)).refine((o) => Object.keys(o).length <= 12, "fields"),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("البيانات مش مظبوطة");
  const d = await getDemoBySlug(parsed.data.slug);
  if (!d || !d.siteLive || d.archived) return jsonError("الموقع مش متاح", 404);
  const ip = (await sha256(`sub:${await clientIp()}`)).slice(0, 24);
  if (!(await rateLimit(`submit:${ip}`, 20, 3600_000)).ok) return jsonError("طلبات كتير، جرّب بعد شوية", 429);
  const now = Date.now();
  const fields = Object.fromEntries(Object.entries(parsed.data.fields).map(([k, v]) => [k.trim(), v.trim()]));
  const db = await getDb();
  await db.insert(submissions).values({ demoId: d.id, data: JSON.stringify(fields), createdAt: now });
  if (d.webhookUrl) {
    const hook = d.webhookUrl;
    after(async () => {
      await fetch(hook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ site: d.name, slug: d.slug, fields, createdAt: new Date(now).toISOString() }),
        signal: AbortSignal.timeout(6000),
      }).catch(() => {});
    });
  }
  return NextResponse.json({ ok: true });
}
