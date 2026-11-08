import "server-only";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "./db";
import { alerts, demos, events, rates, settings as settingsTable, submissions, visits, type DemoRow } from "./db/schema";
import { DEFAULT_SETTINGS, SettingsSchema, type Settings } from "./settings";
import { ContentSchema, PUBLIC_STATUSES, type DemoContent, type Status } from "./demo/model";
import { isExpired } from "./expiry";
import { randomId, uniqueSlug, isValidSlug } from "./slug";

export type Demo = Omit<DemoRow, "content"> & { content: DemoContent };

export function toDemo(row: DemoRow): Demo {
  let content: DemoContent;
  try {
    content = ContentSchema.parse(JSON.parse(row.content));
  } catch {
    content = JSON.parse(row.content) as DemoContent;
  }
  return { ...row, content };
}

export async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select({ id: demos.id }).from(demos).where(exceptId ? and(eq(demos.slug, slug), ne(demos.id, exceptId)) : eq(demos.slug, slug)).limit(1);
  return rows.length > 0;
}

export async function freeSlug(base: string, exceptId?: string): Promise<string> {
  return uniqueSlug(base, (s) => slugTaken(s, exceptId));
}

export async function listDemos(): Promise<Demo[]> {
  const db = await getDb();
  const rows = await db.select().from(demos).orderBy(desc(demos.updatedAt));
  return rows.map(toDemo);
}

export async function getDemo(id: string): Promise<Demo | null> {
  const db = await getDb();
  const [row] = await db.select().from(demos).where(eq(demos.id, id)).limit(1);
  return row ? toDemo(row) : null;
}

export async function getDemoBySlug(slug: string): Promise<Demo | null> {
  const db = await getDb();
  const [row] = await db.select().from(demos).where(eq(demos.slug, slug)).limit(1);
  return row ? toDemo(row) : null;
}

/** Public = published status, not archived. Expiry is handled by the page (it shows the expired screen). */
export function isPublic(d: Pick<Demo, "status" | "archived">): boolean {
  return !d.archived && PUBLIC_STATUSES.includes(d.status as Status);
}
export function isLive(d: Pick<Demo, "status" | "archived" | "expiresAt">, now = Date.now()): boolean {
  return isPublic(d) && !isExpired(d.expiresAt, now);
}

export async function createDemo(input: {
  content: DemoContent;
  slug?: string;
  status?: Status;
  note?: string;
  expiresAt: number;
  source?: string;
  isSample?: boolean;
  id?: string;
}): Promise<Demo> {
  const db = await getDb();
  const now = Date.now();
  const slug = input.slug && isValidSlug(input.slug) && !(await slugTaken(input.slug)) ? input.slug : await freeSlug(input.slug || input.content.nameEn || input.content.name);
  const row = {
    id: input.id || randomId(12),
    slug,
    status: input.status || "draft",
    niche: input.content.niche,
    style: input.content.style,
    name: input.content.name,
    content: JSON.stringify(input.content),
    note: input.note || "",
    source: input.source || "studio",
    isSample: input.isSample ? 1 : 0,
    expiresAt: input.expiresAt,
    publishedAt: input.status && PUBLIC_STATUSES.includes(input.status) ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(demos).values(row);
  return (await getDemo(row.id))!;
}

export type DemoPatch = Partial<{
  content: DemoContent;
  slug: string;
  status: Status;
  note: string;
  expiresAt: number;
  archived: boolean;
  siteLive: boolean;
  webhookUrl: string;
}>;

export async function updateDemo(id: string, patch: DemoPatch): Promise<Demo | null> {
  const db = await getDb();
  const current = await getDemo(id);
  if (!current) return null;
  const set: Partial<DemoRow> = { updatedAt: Date.now() };
  if (patch.content) {
    set.content = JSON.stringify(patch.content);
    set.name = patch.content.name;
    set.niche = patch.content.niche;
    set.style = patch.content.style;
  }
  if (patch.slug !== undefined) set.slug = patch.slug;
  if (patch.status !== undefined) {
    set.status = patch.status;
    if (PUBLIC_STATUSES.includes(patch.status) && !current.publishedAt) set.publishedAt = Date.now();
  }
  if (patch.note !== undefined) set.note = patch.note;
  if (patch.expiresAt !== undefined) set.expiresAt = patch.expiresAt;
  if (patch.archived !== undefined) set.archived = patch.archived ? 1 : 0;
  if (patch.siteLive !== undefined) set.siteLive = patch.siteLive ? 1 : 0;
  if (patch.webhookUrl !== undefined) set.webhookUrl = patch.webhookUrl;
  await db.update(demos).set(set).where(eq(demos.id, id));
  return getDemo(id);
}

export async function duplicateDemo(id: string, expiresAt: number): Promise<Demo | null> {
  const d = await getDemo(id);
  if (!d) return null;
  const content = { ...d.content, name: `${d.content.name} (نسخة)` };
  return createDemo({ content, slug: await freeSlug(`${d.slug}-copy`), status: "draft", note: d.note, expiresAt, source: "duplicate" });
}

export async function deleteDemo(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(events).where(eq(events.demoId, id));
  await db.delete(visits).where(eq(visits.demoId, id));
  await db.delete(alerts).where(eq(alerts.demoId, id));
  await db.delete(submissions).where(eq(submissions.demoId, id));
  await db.delete(demos).where(eq(demos.id, id));
}

export async function demoTimeline(id: string, limit = 80) {
  const db = await getDb();
  const [ev, vs] = await Promise.all([
    db.select().from(events).where(eq(events.demoId, id)).orderBy(desc(events.createdAt)).limit(limit),
    db.select().from(visits).where(eq(visits.demoId, id)).orderBy(desc(visits.startedAt)).limit(30),
  ]);
  return { events: ev, visits: vs };
}

export async function recentActivity(since: number) {
  const db = await getDb();
  const rows = await db
    .select({ id: events.id, demoId: events.demoId, type: events.type, label: events.label, createdAt: events.createdAt, name: demos.name, slug: demos.slug })
    .from(events)
    .innerJoin(demos, eq(events.demoId, demos.id))
    .where(and(sql`${events.createdAt} > ${since}`, inArray(events.type, ["open", "reopen", "cta_contact", "form_submit", "cta_call"])))
    .orderBy(desc(events.createdAt))
    .limit(10);
  return rows;
}

export async function listSubmissions(demoId: string) {
  const db = await getDb();
  return db.select().from(submissions).where(eq(submissions.demoId, demoId)).orderBy(desc(submissions.createdAt)).limit(100);
}

/* ---------- Settings ---------- */

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "studio")).limit(1);
  if (!row) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(row.value);
    return SettingsSchema.parse({ ...DEFAULT_SETTINGS, ...parsed, presets: { ...DEFAULT_SETTINGS.presets, ...(parsed.presets || {}) } });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  const db = await getDb();
  const value = JSON.stringify(s);
  await db.insert(settingsTable).values({ key: "studio", value }).onConflictDoUpdate({ target: settingsTable.key, set: { value } });
}

/* ---------- Rate limiting (fixed window, stored in the DB so it works across serverless instances) ---------- */

export async function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): Promise<{ ok: boolean; retryInMs: number }> {
  const db = await getDb();
  const [row] = await db.select().from(rates).where(eq(rates.key, key)).limit(1);
  if (!row || row.resetAt <= now) {
    await db.insert(rates).values({ key, count: 1, resetAt: now + windowMs }).onConflictDoUpdate({ target: rates.key, set: { count: 1, resetAt: now + windowMs } });
    return { ok: true, retryInMs: 0 };
  }
  if (row.count >= limit) return { ok: false, retryInMs: row.resetAt - now };
  await db.update(rates).set({ count: row.count + 1 }).where(eq(rates.key, key));
  return { ok: true, retryInMs: 0 };
}

export async function resetRate(key: string): Promise<void> {
  const db = await getDb();
  await db.delete(rates).where(eq(rates.key, key));
}
