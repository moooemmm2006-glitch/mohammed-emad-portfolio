'use strict';
// Drives the "ربط تيك توك" form: gets the authorize link, simulates TikTok's redirect, pastes it back.
const { chromium } = require('playwright');
const BASE = process.env.N8N_URL || 'http://localhost:5678';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(BASE + '/form/tiktok-connect');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=اربط حساب تيك توك', { timeout: 60000 });
  const href = await page.getAttribute('a:has-text("اربط حساب تيك توك")', 'href');
  const u = new URL(href);
  const state = u.searchParams.get('state');
  const redirect = u.searchParams.get('redirect_uri');
  const pasted = process.argv[2] === 'badstate' ? redirect + '?code=abc&state=wrong' : redirect + '?code=abc123&scopes=user.info.basic%2Cvideo.publish&state=' + state;
  await page.fill('input[type=text]', pasted);
  await page.click('button[type=submit]');
  await page.waitForFunction(() => /اتربط|مانجحش/.test(document.body.innerText), null, { timeout: 60000 });
  console.log(JSON.stringify({ authorizeUrl: href, result: await page.evaluate(() => document.body.innerText) }, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
