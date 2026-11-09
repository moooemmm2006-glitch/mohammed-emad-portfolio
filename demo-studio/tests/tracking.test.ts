import { describe, expect, it } from "vitest";
import { visitorHash } from "@/lib/auth";
import { ALERT_THROTTLE_MS, alertText, cairoDay, callHint, isBot, mergeSections, shouldAlert } from "@/lib/tracking";

describe("visit dedupe", () => {
  it("same IP + UA on the same Cairo day → same visitor; next day → new", async () => {
    const a = await visitorHash("1.2.3.4", "UA", "2026-11-08");
    expect(await visitorHash("1.2.3.4", "UA", "2026-11-08")).toBe(a);
    expect(await visitorHash("1.2.3.4", "UA", "2026-11-09")).not.toBe(a);
    expect(await visitorHash("1.2.3.5", "UA", "2026-11-08")).not.toBe(a);
  });
  it("never contains the raw IP", async () => {
    expect(await visitorHash("1.2.3.4", "UA", "d")).not.toContain("1.2.3.4");
  });
  it("uses the Cairo calendar day", () => {
    // 23:30 UTC on Nov 8 is already Nov 9 in Cairo (UTC+2).
    expect(cairoDay(Date.UTC(2026, 10, 8, 23, 30))).toBe("2026-11-09");
  });
  it("merges seen sections without duplicates or junk", () => {
    expect(mergeSections('["hero"]', ["hero", "faq", "<script>"])).toEqual(["hero", "faq"]);
    expect(mergeSections("not json", ["form"])).toEqual(["form"]);
  });
  it("ignores bots and link-preview crawlers", () => {
    expect(isBot("WhatsApp/2.23.20.0")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(false);
  });
});

describe("alert throttle", () => {
  const now = 1_800_000_000_000;
  it("sends the first alert and then one per 30 minutes", () => {
    expect(shouldAlert(null, now)).toBe(true);
    expect(shouldAlert(now - 5 * 60_000, now)).toBe(false);
    expect(shouldAlert(now - ALERT_THROTTLE_MS, now)).toBe(true);
  });
  it("formats the Telegram text", () => {
    expect(alertText("open", "English Dose", { device: "mobile" })).toBe("🔥 English Dose فتح النموذج دلوقتي (موبايل)");
    expect(alertText("cta", "English Dose", { device: "mobile", durationMs: 102_000, scroll: 80 })).toContain("(موبايل، 1:42 دقيقة، وصل لـ 80%)");
  });
  it("gives a best-time-to-call hint", () => {
    expect(callHint(now - 10 * 60_000, now).text).toBe("اتفتح من 10 دقايق، كلّمه دلوقتي 📞");
    expect(callHint(null, now).tone).toBe("none");
  });
});
