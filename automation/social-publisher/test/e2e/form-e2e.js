'use strict';
// End-to-end: drives the real n8n form in Chromium (Playwright).
// usage: node test/e2e/form-e2e.js <video> <outDir> [select=all|label1|label2] [when=now|later]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const [video, outDir, select = 'all', when = 'now'] = process.argv.slice(2);
const BASE = process.env.N8N_URL || 'http://localhost:5678';

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 1 });
  const shot = (n) => page.screenshot({ path: path.join(outDir, n + '.png'), fullPage: true });
  await page.goto(BASE + '/form/publish');
  await page.setInputFiles('input[type=file]', video);
  await page.fill('textarea', 'أول سطر في الكابشن 🎬\nسطر تاني @friend');
  const texts = page.locator('input[type=text]');
  await texts.nth(0).fill('#مصر food');
  await shot('1-page1');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=انشر فين؟', { timeout: 60000 });
  await shot('2-page2');
  const summary = await page.locator('form').innerText();
  const boxes = page.locator('.multiselect-checkbox');
  const n = await boxes.count();
  const labels = [];
  for (let i = 0; i < n; i++) {
    const id = await boxes.nth(i).getAttribute('id');
    const label = (await page.locator('label[for="' + id + '"]').innerText()).trim();
    labels.push(label);
    const want = select === 'all' ? !/انشر دلوقتي|جدول/.test(label) : select.split('|').includes(label);
    const isWhen = /انشر دلوقتي|جدول/.test(label);
    if (isWhen) {
      if ((when === 'now' && /انشر دلوقتي/.test(label)) || (when !== 'now' && /جدول/.test(label))) await boxes.nth(i).check();
    } else if (want) await boxes.nth(i).check();
  }
  if (when !== 'now') {
    const [d, t] = when.split('T');
    await page.fill('input[type=date]', d);
    const tx = page.locator('input[type=text]');
    await tx.nth((await tx.count()) - 1).fill(t);
  }
  await page.click('button[type=submit]');
  await page.waitForFunction(() => !/انشر فين؟/.test(document.body.innerText) && /اتنشر|ماتنشرش|اتجدول|ماينفعش|❌|Problem|problem/.test(document.body.innerText), null, { timeout: 180000 });
  await page.waitForTimeout(500);
  await shot('3-result');
  const result = await page.evaluate(() => document.body.innerText);
  console.log(JSON.stringify({ labels, summary, result }, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
