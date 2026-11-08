import "server-only";
import JSZip from "jszip";

/** Small vanilla script for the static export: forms → WhatsApp, product filter. */
export const EXPORT_SCRIPT = `(function(){
document.querySelectorAll('form[data-wa]').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();
var lines=[f.getAttribute('data-title')||''];f.querySelectorAll('[data-label]').forEach(function(i){if(i.value)lines.push(i.getAttribute('data-label')+': '+i.value)});
window.open('https://wa.me/'+f.getAttribute('data-wa').replace(/\\?.*/,'')+'?text='+encodeURIComponent(lines.join('\\n')),'_blank','noopener');});});
document.querySelectorAll('[data-cat-root]').forEach(function(root){root.querySelectorAll('[data-cat-btn]').forEach(function(b){b.addEventListener('click',function(){
var c=b.getAttribute('data-cat-btn');root.querySelectorAll('[data-cat-btn]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});
root.querySelectorAll('[data-product]').forEach(function(li){li.style.display=!c||li.getAttribute('data-product')===c?'':'none'});});});});
})();`;

/**
 * Turn the rendered /s/[slug] page into a self-contained folder: index.html + assets/.
 * Next.js scripts are dropped (the page is fully server-rendered); CSS, fonts and images are inlined as files.
 */
export async function buildExportZip(pageUrl: string, origin: string, folder: string): Promise<Uint8Array> {
  const res = await fetch(pageUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`render failed: ${res.status}`);
  let html = await res.text();
  const zip = new JSZip();
  const dir = zip.folder(folder)!;
  const assets = dir.folder("assets")!;
  const seen = new Map<string, string>();
  let n = 0;

  async function grab(url: string, ext?: string): Promise<string> {
    const abs = new URL(url, origin).toString();
    if (seen.has(abs)) return seen.get(abs)!;
    const r = await fetch(abs);
    if (!r.ok) return url;
    const buf = new Uint8Array(await r.arrayBuffer());
    const name = `${String(++n).padStart(2, "0")}-${(new URL(abs).pathname.split("/").pop() || "file").replace(/[^\w.-]/g, "").slice(-60)}${ext && !abs.endsWith(ext) ? ext : ""}`;
    assets.file(name, buf);
    seen.set(abs, `assets/${name}`);
    return `assets/${name}`;
  }

  // Drop Next.js runtime scripts and script preloads.
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<link[^>]+rel="(?:preload|modulepreload)"[^>]+as="script"[^>]*>/gi, "");
  // Stylesheets (+ fonts referenced inside them).
  for (const m of [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/gi)]) {
    const cssUrl = new URL(m[1], origin).toString();
    let css = await (await fetch(cssUrl)).text();
    for (const u of [...css.matchAll(/url\((?:'|")?([^'")]+)(?:'|")?\)/g)]) {
      if (u[1].startsWith("data:")) continue;
      const local = await grab(new URL(u[1], cssUrl).toString());
      css = css.split(u[1]).join(local.replace("assets/", ""));
    }
    const name = `style-${++n}.css`;
    assets.file(name, css);
    html = html.replace(m[0], `<link rel="stylesheet" href="assets/${name}">`);
  }
  html = html.replace(/<link[^>]+rel="preload"[^>]+as="font"[^>]*>/gi, "");
  // Images (uploaded photos, logos).
  for (const m of [...html.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/gi)]) {
    if (m[1].startsWith("data:")) continue;
    const local = await grab(m[1].replace(/&amp;/g, "&"));
    html = html.split(`src="${m[1]}"`).join(`src="${local}"`);
  }
  html = html.replace(/\ssrcset="[^"]*"/gi, "");
  html = html.replace("</body>", `<script>${EXPORT_SCRIPT}</script></body>`);
  dir.file("index.html", html);
  dir.file("README.txt", "Upload this folder to any static host (Netlify, cPanel, GitHub Pages…).\nارفع الفولدر ده على أي استضافة: الصفحة الرئيسية index.html.\n");
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
