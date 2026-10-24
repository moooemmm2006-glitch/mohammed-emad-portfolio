// Renders the carousel: node render.js  (needs a static server on the repo root at :8765)
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const OUT = path.join(__dirname, '..');
const BASE = 'http://127.0.0.1:8765/brand/social/posts/launch-carousel/source/carousel.html';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 })).newPage();
  const jobs = [];
  for (const l of ['ar', 'en']) {
    for (let s = 1; s <= 7; s++) jobs.push([`?lang=${l}&s=${s}`, `${l}/slide-${String(s).padStart(2, '0')}.png`]);
    jobs.push([`?lang=${l}&s=4&alt=ark`, `${l}/alt/slide-04-ahmed-ark.png`]);
  }
  for (const [q, f] of jobs) {
    await p.goto(BASE + q, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
    const over = await p.evaluate(() => { const f = document.querySelector('.frame').getBoundingClientRect(); return [...document.querySelectorAll('.main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.bottom > f.bottom - 50 || r.top < f.top + 40 || r.left < f.left - 1 || r.right > f.right + 1; }).map((e) => e.className || e.tagName); });
    if (over.length) console.log('OVERFLOW', q, over.slice(0, 5));
    await p.screenshot({ path: path.join(OUT, f) });
  }
  await b.close();
})();
