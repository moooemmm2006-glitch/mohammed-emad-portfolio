import { NextResponse, after } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { visitorHash } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { alerts, demos, events, visits } from "@/lib/db/schema";
import { siteUrl } from "@/lib/owner";
import { getDemoBySlug, isLive, rateLimit } from "@/lib/repo";
import { clientIp, isStudio } from "@/lib/session";
import { sendTelegram } from "@/lib/telegram";
import { alertText, cairoDay, EVENT_TYPES, isBot, mergeSections, shouldAlert } from "@/lib/tracking";

const Common = { slug: z.string().min(1).max(60) };
const Engagement = {
  visitId: z.number().int().positive(),
  durationMs: z.number().int().min(0).max(6 * 3600_000).optional(),
  scroll: z.number().int().min(0).max(100).optional(),
  sections: z.array(z.string().max(24)).max(30).optional(),
};
const Body = z.discriminatedUnion("type", [
  z.object({ type: z.literal("view"), ...Common, device: z.enum(["mobile", "tablet", "desktop"]).default("desktop"), referrer: z.string().max(200).optional() }),
  z.object({ type: z.literal("ping"), ...Common, ...Engagement }),
  z.object({ type: z.literal("event"), ...Common, ...Engagement, event: z.enum(EVENT_TYPES), label: z.string().max(80).optional() }),
]);

const skip = (reason: string) => NextResponse.json({ skip: reason });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const body = parsed.data;
  // My own visits never count: logged into the studio (?preview=1 never loads the tracker).
  if (await isStudio()) return skip("studio");
  const ua = (await headers()).get("user-agent") || "";
  if (isBot(ua)) return skip("bot");
  const demo = await getDemoBySlug(body.slug);
  if (!demo || !isLive(demo)) return skip("not live");
  const db = await getDb();
  const now = Date.now();

  if (body.type === "view") {
    const day = cairoDay(now);
    const visitor = await visitorHash(await clientIp(), ua, day);
    const limited = await rateLimit(`t:${visitor}`, 30, 10 * 60_000);
    if (!limited.ok) return skip("rate");
    const inserted = await db.insert(visits).values({ demoId: demo.id, visitor, day, device: body.device, startedAt: now, lastAt: now })
      .onConflictDoNothing().returning({ id: visits.id });
    const isNew = inserted.length > 0;
    const visitId = isNew ? inserted[0].id : (await db.select({ id: visits.id }).from(visits).where(and(eq(visits.demoId, demo.id), eq(visits.visitor, visitor), eq(visits.day, day))).limit(1))[0]?.id;
    const firstOpen = !demo.firstOpenedAt;
    await db.update(demos).set({
      lastOpenedAt: now,
      ...(isNew ? { views: sql`${demos.views} + 1` } : {}),
      ...(firstOpen ? { firstOpenedAt: now } : {}),
      ...(demo.status === "sent" && !demo.isSample ? { status: "opened" } : {}),
    }).where(eq(demos.id, demo.id));
    if (isNew) {
      await db.insert(events).values({ demoId: demo.id, visitId, type: firstOpen ? "open" : "reopen", label: body.device, createdAt: now });
      if (!demo.isSample) after(() => maybeAlert(demo.id, firstOpen ? "open" : "reopen", alertText(firstOpen ? "open" : "reopen", demo.name, { device: body.device }), now));
    }
    return NextResponse.json({ visitId });
  }

  // ping / event: only for a visit of this demo
  const [visit] = await db.select().from(visits).where(and(eq(visits.id, body.visitId), eq(visits.demoId, demo.id))).limit(1);
  if (!visit) return skip("no visit");
  await db.update(visits).set({
    lastAt: now,
    durationMs: Math.max(visit.durationMs, body.durationMs || 0),
    maxScroll: Math.max(visit.maxScroll, body.scroll || 0),
    sections: JSON.stringify(mergeSections(visit.sections, body.sections || [])),
  }).where(eq(visits.id, visit.id));

  if (body.type === "event") {
    await db.insert(events).values({ demoId: demo.id, visitId: visit.id, type: body.event, label: body.label || "", createdAt: now });
    if (body.event === "cta_contact") {
      await db.update(demos).set({ ctaClicks: sql`${demos.ctaClicks} + 1` }).where(eq(demos.id, demo.id));
      if (!demo.isSample) {
        const text = alertText("cta", demo.name, { device: visit.device, durationMs: Math.max(visit.durationMs, body.durationMs || 0), scroll: Math.max(visit.maxScroll, body.scroll || 0) });
        after(() => maybeAlert(demo.id, "cta", text, now));
      }
    }
  }
  return NextResponse.json({ ok: true });
}

/** One Telegram message per demo per kind per 30 minutes (the first open is always sent). */
async function maybeAlert(demoId: string, kind: "open" | "reopen" | "cta", text: string, now: number) {
  const db = await getDb();
  const throttleKind = kind === "open" ? "open" : kind;
  const [row] = await db.select().from(alerts).where(and(eq(alerts.demoId, demoId), eq(alerts.kind, throttleKind))).limit(1);
  // A re-open right after the first-open alert is noise.
  const [openRow] = kind === "reopen" ? await db.select().from(alerts).where(and(eq(alerts.demoId, demoId), eq(alerts.kind, "open"))).limit(1) : [];
  if (!shouldAlert(row?.sentAt, now) || (openRow && !shouldAlert(openRow.sentAt, now))) return;
  await db.insert(alerts).values({ demoId, kind: throttleKind, sentAt: now }).onConflictDoUpdate({ target: [alerts.demoId, alerts.kind], set: { sentAt: now } });
  await sendTelegram(`${text}\n${siteUrl()}/studio/demos/${demoId}/activity`);
}
