import { describe, expect, it } from "vitest";
import { parseDays, parseHours, parseQuickPaste, parseTimeRange } from "@/lib/quickPaste";
import { displayPhone, findPhones, isEgMobile, normalizeEgPhone, toIntl } from "@/lib/phone";

describe("Egyptian phones", () => {
  it.each([
    ["01012345678", "01012345678"],
    ["010 1234 5678", "01012345678"],
    ["+20 101 234 5678", "01012345678"],
    ["00201112345678", "01112345678"],
    ["201512345678", "01512345678"],
    ["٠١٢٢٣٤٥٦٧٨٩", "01223456789"],
    ["(02) 2345 6789", "0223456789"],
  ])("normalises %s", (raw, out) => expect(normalizeEgPhone(raw)).toBe(out));

  it("rejects non-Egyptian or broken numbers", () => {
    expect(normalizeEgPhone("0131234567")).toBe("");
    expect(normalizeEgPhone("12345")).toBe("");
    expect(isEgMobile("0223456789")).toBe(false);
    expect(isEgMobile("01012345678")).toBe(true);
  });

  it("builds wa.me numbers and display form", () => {
    expect(toIntl("01012345678")).toBe("201012345678");
    expect(displayPhone("+201012345678")).toBe("010 1234 5678");
  });

  it("finds every phone in a text once", () => {
    expect(findPhones("كلمنا 010-1234-5678 أو +20 111 234 5678 أو 01012345678")).toEqual(["01012345678", "01112345678"]);
  });
});

describe("hours", () => {
  it("reads 12-hour English ranges", () => {
    expect(parseTimeRange("9:00 AM – 10:00 PM")).toEqual({ from: "09:00", to: "22:00" });
    expect(parseTimeRange("9 am-11:30 pm")).toEqual({ from: "09:00", to: "23:30" });
  });
  it("reads Arabic ranges", () => {
    expect(parseTimeRange("من ١٠ ص لـ ١٠ م")).toEqual({ from: "10:00", to: "22:00" });
    expect(parseTimeRange("10 صباحاً - 9 مساءً")).toEqual({ from: "10:00", to: "21:00" });
  });
  it("assumes pm for a closing hour without a meridiem", () => {
    expect(parseTimeRange("10 - 10")).toEqual({ from: "10:00", to: "22:00" });
  });
  it("expands day ranges in both languages", () => {
    expect(parseDays("السبت - الخميس")).toEqual([0, 1, 2, 3, 4, 5]);
    expect(parseDays("من السبت للخميس")).toEqual([0, 1, 2, 3, 4, 5]);
    expect(parseDays("Sunday to Thursday")).toEqual([1, 2, 3, 4, 5]);
    expect(parseDays("الجمعة")).toEqual([6]);
  });
  it("parses Google Maps style blocks (day line, then hours line)", () => {
    const h = parseHours("Saturday\n9 AM–10 PM\nSunday\n9 AM–10 PM\nFriday\nClosed")!;
    expect(h[0]).toEqual({ open: true, from: "09:00", to: "22:00" });
    expect(h[1]).toEqual({ open: true, from: "09:00", to: "22:00" });
    expect(h[6].open).toBe(false);
  });
  it("parses an Arabic summary line plus a closed day", () => {
    const h = parseHours("السبت - الخميس: 10 ص - 10 م\nالجمعة مغلق")!;
    expect(h.slice(0, 6).every((d) => d.open && d.from === "10:00" && d.to === "22:00")).toBe(true);
    expect(h[6].open).toBe(false);
  });
  it("returns undefined when no hours are present", () => {
    expect(parseHours("مجرد كلام")).toBeUndefined();
  });
});

describe("quick paste", () => {
  it("extracts a Google Maps card", () => {
    const p = parseQuickPaste(`English Dose
4.8 (120)
Language school
ش عباس العقاد، مدينة نصر، القاهرة
010 1234 5678
https://maps.app.goo.gl/AbCd123
Saturday 10 AM–10 PM`);
    expect(p.name).toBe("English Dose");
    expect(p.phone).toBe("01012345678");
    expect(p.whatsapp).toBe("01012345678");
    expect(p.address).toContain("عباس العقاد");
    expect(p.area).toBe("مدينة نصر");
    expect(p.mapsUrl).toBe("https://maps.app.goo.gl/AbCd123");
    expect(p.niche).toBe("courses");
    expect(p.hours?.[0]).toEqual({ open: true, from: "10:00", to: "22:00" });
  });
  it("prefers a labelled name and detects clinics", () => {
    const p = parseQuickPaste("الاسم: عيادة د. منى للأسنان\nالتليفون: 0223456789\nموبايل 01112345678");
    expect(p.name).toBe("عيادة د. منى للأسنان");
    expect(p.phone).toBe("01112345678");
    expect(p.niche).toBe("clinic");
  });
  it("handles empty input", () => {
    expect(parseQuickPaste("   ")).toEqual({});
  });
});
