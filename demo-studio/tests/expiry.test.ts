import { describe, expect, it } from "vitest";
import { arAgo, DAY_MS, daysLeft, expiryFrom, extendExpiry, isExpired } from "@/lib/expiry";

const NOW = Date.UTC(2026, 10, 8, 10);

describe("expiry", () => {
  it("defaults to N days from now, clamped", () => {
    expect(expiryFrom(NOW, 14)).toBe(NOW + 14 * DAY_MS);
    expect(expiryFrom(NOW, 0)).toBe(NOW + DAY_MS);
    expect(expiryFrom(NOW, 9999)).toBe(NOW + 365 * DAY_MS);
  });
  it("detects expiry at the boundary", () => {
    expect(isExpired(NOW, NOW)).toBe(true);
    expect(isExpired(NOW + 1, NOW)).toBe(false);
  });
  it("extends from the current end while active", () => {
    expect(extendExpiry(NOW + 3 * DAY_MS, 14, NOW)).toBe(NOW + 17 * DAY_MS);
  });
  it("revives an expired demo from today", () => {
    expect(extendExpiry(NOW - 5 * DAY_MS, 14, NOW)).toBe(NOW + 14 * DAY_MS);
  });
  it("counts days left", () => {
    expect(daysLeft(NOW + 2.5 * DAY_MS, NOW)).toBe(3);
    expect(daysLeft(NOW - DAY_MS, NOW)).toBeLessThan(0);
  });
  it("speaks Egyptian relative time", () => {
    expect(arAgo(NOW - 2 * 3600_000, NOW)).toBe("من ساعتين");
    expect(arAgo(NOW - 10 * 60_000, NOW)).toBe("من 10 دقايق");
    expect(arAgo(NOW - 20_000, NOW)).toBe("دلوقتي");
  });
});
