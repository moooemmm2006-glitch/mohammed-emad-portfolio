import { expect, test, devices, type Page } from "@playwright/test";

const NAME = "سنتر الاختبار التجريبي";

async function login(page: Page) {
  await page.goto("/studio/login");
  await page.fill("#pw", "e2e-password");
  await page.getByRole("button", { name: "دخول" }).click();
  await page.waitForURL("**/studio");
}

test("create a demo, open it as a visitor, click the CTA; views count once and studio visits don't count", async ({ browser }) => {
  // 1) Studio: create through the editor.
  const studio = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const sp = await studio.newPage();
  await login(sp);
  await sp.goto("/studio/new");
  await sp.getByRole("button", { name: "التالي" }).click();
  const name = sp.getByLabel("اسم البيزنس (عربي) *");
  await name.fill(NAME);
  await sp.getByLabel("التليفون", { exact: true }).fill("01012345678");
  await sp.waitForURL(/\/studio\/demos\/[a-z0-9]+$/, { timeout: 30_000 });
  const id = sp.url().split("/").pop()!;
  await expect(sp.getByText("اتحفظ ✓")).toBeVisible({ timeout: 15_000 });
  // Publish step.
  await sp.getByRole("button", { name: /النشر/ }).click();
  await sp.getByRole("button", { name: /انشر وجهّز للإرسال/ }).click();
  await sp.waitForURL(`**/studio/demos/${id}/share`, { timeout: 30_000 });
  const { demo } = await (await sp.request.get(`/api/studio/demos/${id}`)).json();
  expect(demo.status).toBe("sent");
  const slug = demo.slug as string;

  // 2) Visitor on a phone.
  const visitor = await browser.newContext({ ...devices["iPhone 13"] });
  // No network to WhatsApp in CI: answer wa.me locally.
  await visitor.route(/wa\.me|whatsapp\.com/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "wa" }));
  const vp = await visitor.newPage();
  await vp.goto(`/demo/${slug}`);
  await expect(vp.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(vp.getByText(NAME).first()).toBeVisible();
  // Wait for the view to register, then click "كلّمني" (opens WhatsApp in a new tab).
  await expect.poll(async () => (await (await sp.request.get(`/api/studio/demos/${id}`)).json()).demo.views, { timeout: 20_000 }).toBe(1);
  const [popup] = await Promise.all([vp.waitForEvent("popup"), vp.getByText("عايز الموقع ده؟ كلّمني").first().click()]);
  expect(popup.url()).toContain("wa.me");
  await popup.close();
  await expect.poll(async () => {
    const j = await (await sp.request.get(`/api/studio/demos/${id}`)).json();
    return j.timeline.events.map((e: { type: string }) => e.type);
  }, { timeout: 15_000 }).toContain("cta_contact");

  // Same visitor again the same day: still one view.
  await vp.reload();
  await expect(vp.getByText(NAME).first()).toBeVisible();
  await vp.waitForTimeout(2500);

  // 3) Studio visits never count.
  const own = await sp.context().newPage();
  await own.goto(`/demo/${slug}`);
  await expect(own.getByText(NAME).first()).toBeVisible();
  await own.goto(`/demo/${slug}?preview=1`);
  await own.waitForTimeout(2500);

  const final = (await (await sp.request.get(`/api/studio/demos/${id}`)).json()).demo;
  expect(final.views).toBe(1);
  expect(final.status).toBe("opened");
  expect(final.ctaClicks).toBe(1);
  await visitor.close();
  await studio.close();
});

test("drafts are not public and the expired page appears after expiry", async ({ browser }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await login(p);
  const r = await p.request.post("/api/studio/demos", { data: { basics: { niche: "clinic", name: "عيادة مسودة" } } });
  const { demo } = await r.json();
  const anon = await browser.newContext();
  const a = await anon.newPage();
  expect((await a.goto(`/demo/${demo.slug}`))!.status()).toBe(404);
  await p.request.patch(`/api/studio/demos/${demo.id}`, { data: { status: "sent", expiresAt: Date.now() - 1000 } });
  await a.goto(`/demo/${demo.slug}`);
  await expect(a.getByText("النموذج ده خلص")).toBeVisible();
  const ext = await (await p.request.patch(`/api/studio/demos/${demo.id}`, { data: { action: "extend", days: 7 } })).json();
  expect(ext.demo.expired).toBe(false);
  await a.goto(`/demo/${demo.slug}`);
  await expect(a.getByText("النموذج ده خلص")).toHaveCount(0);
  await expect(a.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
  await ctx.close();
  await anon.close();
});
