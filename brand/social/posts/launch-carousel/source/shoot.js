const { chromium } = require('/opt/node-tools/node_modules/playwright');
const OUT = __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ args: ['--hide-scrollbars'] });
  async function shot(lang, vp, dsf, url, sel, name, mobile) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf, isMobile: !!mobile, hasTouch: !!mobile, reducedMotion: 'reduce' });
    await ctx.addInitScript((l) => { try { localStorage.setItem('lang', l); } catch (e) {} }, lang);
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.addStyleTag({ content: '*{scroll-behavior:auto!important} ::-webkit-scrollbar{display:none} .reveal{opacity:1!important;transform:none!important} [class*="float"],[class*="toast"],[class*="popup"]{display:none!important}' });
    if (sel) {
      await p.evaluate((s) => { const e = document.querySelector(s); const h = document.querySelector('header'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - (h ? h.offsetHeight : 0) + 1); }, sel);
    }
    await p.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in')));
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/${name}-${lang}.png` });
    await ctx.close();
  }
  const H = 'http://127.0.0.1:8765';
  for (const l of ['ar', 'en']) {
    await shot(l, { width: 1440, height: 900 }, 2, H + '/', null, 'hero-desktop');
    await shot(l, { width: 390, height: 844 }, 3, H + '/', null, 'hero-mobile', true);
    await shot(l, { width: 1440, height: 900 }, 2, H + '/', '#services', 'services-desktop');
    await shot(l, { width: 390, height: 844 }, 3, H + '/consultation.html', null, 'consult-mobile', true);
    await shot(l, { width: 1440, height: 900 }, 2, 'http://localhost:3005/', null, 'ark-desktop');
  }
  await b.close();
})();
