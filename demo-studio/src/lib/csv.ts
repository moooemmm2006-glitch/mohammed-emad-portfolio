import { guessNiche } from "./quickPaste";
import { normalizeEgPhone } from "./phone";
import type { Niche } from "./demo/model";

/** RFC 4180-ish parser: quotes, escaped quotes, newlines inside quotes; comma / semicolon / tab. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] || "";
  const counts = { ",": 0, ";": 0, "\t": 0 } as Record<string, number>;
  let q = false;
  for (const ch of firstLine) { if (ch === '"') q = !q; else if (!q && ch in counts) counts[ch]++; }
  const sep = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0 ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", inQ = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
      else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}

export const CSV_COLUMNS = ["name", "type", "area", "phone", "link", "notes"] as const;
type Col = (typeof CSV_COLUMNS)[number];

const ALIASES: Record<Col, RegExp> = {
  name: /^(name|business|business name|الاسم|اسم|اسم البيزنس|اسم المكان)$/i,
  type: /^(type|category|niche|النوع|نوع|المجال|الفئة)$/i,
  area: /^(area|region|city|location|المنطقة|منطقة|المدينة)$/i,
  phone: /^(phone|mobile|tel|number|whatsapp|التليفون|تليفون|الموبايل|رقم|الرقم|واتساب)$/i,
  link: /^(link|url|maps|map|google maps|اللينك|لينك|رابط|الرابط)$/i,
  notes: /^(notes|note|comments|ملاحظات|ملاحظة)$/i,
};

/** Header row → column index for each known field (falls back to the documented order). */
export function mapHeader(header: string[]): Record<Col, number> {
  const map = {} as Record<Col, number>;
  const known = header.some((h) => Object.values(ALIASES).some((r) => r.test(h.trim())));
  CSV_COLUMNS.forEach((col, i) => {
    const idx = header.findIndex((h) => ALIASES[col].test(h.trim()));
    map[col] = idx >= 0 ? idx : known ? -1 : i;
  });
  return map;
}

export type LeadRow = { name: string; type: string; niche: Niche | null; area: string; phone: string; mapsUrl: string; instagram: string; notes: string; error?: string };

export function csvToLeads(text: string): { leads: LeadRow[]; hasHeader: boolean } {
  const rows = parseCsv(text);
  if (!rows.length) return { leads: [], hasHeader: false };
  const hasHeader = rows[0].some((h) => Object.values(ALIASES).some((r) => r.test(h.trim())));
  const map = mapHeader(hasHeader ? rows[0] : []);
  const body = hasHeader ? rows.slice(1) : rows;
  const get = (r: string[], c: Col) => (map[c] >= 0 ? r[map[c]] || "" : "");
  const leads = body.slice(0, 300).map((r) => {
    const name = get(r, "name").slice(0, 80);
    const type = get(r, "type");
    const link = get(r, "link");
    const rawPhone = get(r, "phone");
    const phone = normalizeEgPhone(rawPhone);
    const lead: LeadRow = {
      name,
      type,
      niche: guessNiche(`${type} ${name}`) || null,
      area: get(r, "area").slice(0, 80),
      phone: phone || rawPhone.slice(0, 30),
      mapsUrl: /instagram\.com/i.test(link) ? "" : /^https?:\/\//i.test(link) ? link.slice(0, 500) : "",
      instagram: /instagram\.com/i.test(link) ? link.slice(0, 200) : "",
      notes: get(r, "notes").slice(0, 1000),
    };
    if (!name) lead.error = "مفيش اسم";
    else if (rawPhone && !phone) lead.error = "الرقم مش مصري واضح";
    return lead;
  });
  return { leads, hasHeader };
}
