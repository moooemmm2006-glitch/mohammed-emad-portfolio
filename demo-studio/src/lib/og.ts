import "server-only";
import fs from "fs";
import path from "path";
import { Resvg } from "@resvg/resvg-js";
import { createElement } from "react";
import { NicheArt } from "@/templates/Art";
import { CLINIC_TYPE_LABEL, NICHE_SHORT, type DemoContent } from "./demo/model";
import { phrases } from "./demo/defaults";
import { mix, readableOn, themeVars } from "./palette";

/**
 * Share images are SVG → PNG with resvg (it shapes Arabic correctly; next/og/Satori
 * reverses the word order of Arabic text).
 */
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
let fontFiles: string[] | null = null;
function fonts(): string[] {
  if (!fontFiles) fontFiles = ["Cairo-500.ttf", "Cairo-800.ttf"].map((f) => path.join(FONT_DIR, f)).filter((f) => fs.existsSync(f));
  return fontFiles;
}

export function renderPng(svg: string, width?: number): Buffer {
  const r = new Resvg(svg, {
    font: { fontFiles: fonts(), loadSystemFonts: false, defaultFontFamily: "Cairo" },
    fitTo: width ? { mode: "width", value: width } : { mode: "original" },
  });
  return r.render().asPng();
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const AR = /[؀-ۿ]/;
// Emoji have no glyph in the bundled font; drop them from image text.
const clean = (s: string) => s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "").replace(/\s+/g, " ").trim();

/** Right-aligned text line at x (the right edge), RTL or LTR. */
function line(text: string, x: number, y: number, size: number, weight: 500 | 800, fill: string, opacity = 1) {
  let t = clean(text);
  const dir = AR.test(t) ? "rtl" : "ltr";
  // resvg puts trailing neutral punctuation on the wrong side of RTL lines.
  if (dir === "rtl") {
    t = t.replace(/[.!،,:]+$/, "");
    const m = t.match(/…+$/);
    if (m) t = m[0] + t.slice(0, -m[0].length).trim();
  }
  return `<text x="${x}" y="${y}" font-family="Cairo" font-weight="${weight}" font-size="${size}" fill="${fill}" fill-opacity="${opacity}" text-anchor="end" direction="${dir}">${esc(t)}</text>`;
}

/** Greedy word wrap with an average glyph width estimate; adds "…" when cut. */
export function wrap(text: string, maxWidth: number, size: number, maxLines: number): string[] {
  const words = clean(text).split(" ").filter(Boolean);
  const avg = size * (AR.test(text) ? 0.5 : 0.53);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length * avg <= maxWidth || !cur) cur = next;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/\s*\S*$/, "") + "…";
    return kept;
  }
  return lines;
}

function fitName(name: string, maxWidth: number): { size: number; lines: string[] } {
  for (const size of [96, 86, 76, 66, 58]) {
    const lines = wrap(name, maxWidth, size, 2);
    if (!lines[lines.length - 1].endsWith("…")) return { size, lines };
  }
  return { size: 52, lines: wrap(name, maxWidth, 52, 2) };
}

async function artSvg(c: DemoContent, seed: string, w: number, h: number, x: number, y: number, dark: boolean) {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const inner = renderToStaticMarkup(createElement(NicheArt, { niche: c.niche, seed, primary: c.brand.primary, accent: c.brand.accent, dark }));
  return inner.replace("<svg ", `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
}

function nicheLabel(c: DemoContent) {
  return c.niche === "clinic" ? `عيادة ${CLINIC_TYPE_LABEL[c.clinicType]}` : NICHE_SHORT[c.niche] === "سنتر" ? "سنتر دروس وكورسات" : "متجر أونلاين";
}

/** 1200×630 Open Graph card: business name + niche visual + "نموذج موقع خاص بيكم". */
export async function ogSvg(c: DemoContent, seed: string, host: string, site = false): Promise<string> {
  const W = 1200, H = 630;
  const p = c.brand.primary, a = c.brand.accent;
  const deep = mix("#0B0D12", p, 0.32);
  const { size, lines } = fitName(c.name, 600);
  const nameY0 = lines.length === 1 ? 300 : 262;
  const art = await artSvg(c, seed, 430, 430, 70, 100, false);
  const sub = [nicheLabel(c), c.area].filter(Boolean).join(" · ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="0.85" cy="0.1" r="0.8"><stop offset="0" stop-color="${p}" stop-opacity=".55"/><stop offset="1" stop-color="${p}" stop-opacity="0"/></radialGradient>
    <radialGradient id="glow2" cx="0.1" cy="1" r="0.6"><stop offset="0" stop-color="${a}" stop-opacity=".35"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
    <clipPath id="card"><rect x="70" y="100" width="430" height="430" rx="40"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="${deep}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect width="${W}" height="${H}" fill="url(#glow2)"/>
  <g transform="rotate(-3 285 315)">
    <rect x="62" y="92" width="446" height="446" rx="46" fill="#ffffff" fill-opacity=".1"/>
    <g clip-path="url(#card)">${art}</g>
  </g>
  <rect x="${W - 80 - 330}" y="98" width="330" height="54" rx="27" fill="${a}"/>
  ${line(site ? (c.tagline ? wrap(c.tagline, 290, 28, 1)[0] : nicheLabel(c)) : "نموذج موقع خاص بيكم", W - 108, 135, 28, 800, readableOn(a))}
  ${lines.map((l, i) => line(l, W - 80, nameY0 + i * size * 1.18 + size * 0.35, size, 800, "#FFFFFF")).join("\n  ")}
  ${line(sub, W - 80, nameY0 + (lines.length - 1) * size * 1.18 + size * 0.35 + 78, 34, 500, "#FFFFFF", 0.78)}
  <rect x="${W - 80 - 64}" y="${H - 104}" width="64" height="6" rx="3" fill="${a}"/>
  ${line(host, W - 80, H - 56, 26, 500, "#FFFFFF", 0.6)}
</svg>`;
}

/** 1080×1350 picture to send on WhatsApp: the demo's first screen inside a phone frame. */
export async function mockupSvg(c: DemoContent, seed: string): Promise<string> {
  const W = 1080, H = 1350;
  const v = themeVars(c.brand.primary, c.brand.accent, c.brand.mode);
  const ph = phrases(c, seed);
  const p = c.brand.primary, a = c.brand.accent;
  const bold = c.style === "bold";
  // Phone geometry
  const PW = 560, PH = 1090, PX = (W - PW) / 2, PY = 140, S = 22; // screen inset
  const sx = PX + S, sy = PY + S, sw = PW - S * 2, sh = PH - S * 2;
  const R = sx + sw - 36; // right edge for text in the screen
  const heroBg = bold ? v["--deep"] : v["--bg"];
  const heroFg = bold ? "#FFFFFF" : v["--fg"];
  const tag = wrap(c.tagline || c.name, sw - 72, 46, 3);
  const sub = wrap(ph.heroSub, sw - 72, 24, 3);
  const heroH = 200 + tag.length * 58 + sub.length * 36 + 120;
  const art = await artSvg(c, seed, sw - 48, 300, sx + 24, sy + heroH + 30, c.brand.mode === "dark");
  const items = c.services.slice(0, 1);
  const first = (c.name.replace(/^(سنتر|مركز|أكاديمية|اكاديمية|عيادة|متجر|محل)\s+/, "").replace(/^ال/, "")[0] || "•");
  let y = sy + 196;
  const tagSvg = tag.map((l, i) => line(l, R, y + i * 58, 46, 800, heroFg)).join("");
  y += tag.length * 58 + 6;
  const subSvg = sub.map((l, i) => line(l, R, y + i * 36, 24, 500, heroFg, 0.78)).join("");
  y += sub.length * 36 + 30;
  const cardsY = sy + heroH + 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix("#0B0D12", p, 0.28)}"/><stop offset="1" stop-color="#0B0D12"/></linearGradient>
    <radialGradient id="g1" cx=".5" cy=".35" r=".6"><stop offset="0" stop-color="${p}" stop-opacity=".45"/><stop offset="1" stop-color="${p}" stop-opacity="0"/></radialGradient>
    <clipPath id="screen"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="54"/></clipPath>
    <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="40" stdDeviation="40" flood-color="#000" flood-opacity=".55"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#g1)"/>
  <text x="${W / 2}" y="92" font-family="Cairo" font-weight="800" font-size="40" fill="#FFFFFF" text-anchor="middle" direction="rtl">${esc(clean(wrap(c.name, 900, 40, 1)[0]))}</text>
  <rect x="${PX - 4}" y="${PY - 4}" width="${PW + 8}" height="${PH + 8}" rx="80" fill="#1c212c" filter="url(#sh)"/>
  <rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="76" fill="#05060a"/>
  <g clip-path="url(#screen)">
    <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="${v["--bg"]}"/>
    <rect x="${sx}" y="${sy}" width="${sw}" height="${heroH}" fill="${heroBg}"/>
    ${bold ? `<circle cx="${sx + 40}" cy="${sy + 60}" r="170" fill="${p}" fill-opacity=".35"/>` : `<ellipse cx="${sx + sw / 2}" cy="${sy}" rx="${sw}" ry="220" fill="${p}" fill-opacity=".08"/>`}
    <rect x="${R - 52}" y="${sy + 58}" width="52" height="52" rx="14" fill="${v["--btn"]}"/>
    <text x="${R - 26}" y="${sy + 96}" font-family="Cairo" font-weight="800" font-size="30" fill="${v["--btn-ink"]}" text-anchor="middle">${esc(first)}</text>
    ${line(wrap(c.name, sw - 140, 26, 1)[0], R - 66, sy + 94, 26, 800, heroFg)}
    ${tagSvg}
    ${subSvg}
    <rect x="${R - 250}" y="${y}" width="250" height="68" rx="20" fill="${v["--btn"]}"/>
    <text x="${R - 125}" y="${y + 44}" font-family="Cairo" font-weight="800" font-size="26" fill="${v["--btn-ink"]}" text-anchor="middle" direction="rtl">${esc(clean(ph.ctaMain))}</text>
    <rect x="${R - 456}" y="${y}" width="190" height="68" rx="20" fill="none" stroke="${heroFg}" stroke-opacity=".3" stroke-width="2"/>
    <text x="${R - 361}" y="${y + 44}" font-family="Cairo" font-weight="500" font-size="24" fill="${heroFg}" text-anchor="middle" direction="rtl">${esc(clean(ph.ctaSoft))}</text>
    <rect x="${sx + 24}" y="${sy + heroH + 30}" width="${sw - 48}" height="300" rx="34" fill="${v["--card"]}"/>
    <g>${art}</g>
    ${items.map((it, i) => {
      const cy = cardsY + i * 150;
      return `<rect x="${sx + 24}" y="${cy}" width="${sw - 48}" height="130" rx="28" fill="${v["--card"]}" stroke="${v["--line"]}"/>
      ${line(wrap(it.title, sw - 140, 30, 1)[0], R - 10, cy + 56, 30, 800, v["--fg"])}
      ${line(wrap(it.tag || it.desc || "", sw - 140, 22, 1)[0] || "", R - 10, cy + 96, 22, 500, v["--mute"])}`;
    }).join("")}
    <rect x="${sx}" y="${sy + sh - 110}" width="${sw}" height="110" fill="${v["--card"]}" fill-opacity=".97"/>
    <rect x="${sx + 24}" y="${sy + sh - 92}" width="${sw - 140}" height="70" rx="20" fill="${v["--btn"]}"/>
    <text x="${sx + 24 + (sw - 140) / 2}" y="${sy + sh - 47}" font-family="Cairo" font-weight="800" font-size="26" fill="${v["--btn-ink"]}" text-anchor="middle" direction="rtl">${esc(clean(ph.ctaMain))}</text>
    <rect x="${sx + sw - 104}" y="${sy + sh - 92}" width="80" height="70" rx="20" fill="none" stroke="${v["--line"]}" stroke-width="2"/>
  </g>
  <rect x="${W / 2 - 70}" y="${PY + 34}" width="140" height="34" rx="17" fill="#000"/>
  <text x="${W / 2}" y="${H - 52}" font-family="Cairo" font-weight="500" font-size="28" fill="#FFFFFF" fill-opacity=".7" text-anchor="middle" direction="rtl">نموذج مجاني من محمد عماد</text>
</svg>`;
}
