import { describe, expect, it } from "vitest";
import { isValidSlug, slugify, transliterate, uniqueSlug } from "@/lib/slug";

describe("slug transliteration", () => {
  it("keeps English names readable", () => {
    expect(slugify("English Dose")).toBe("english-dose");
    expect(slugify("  Dr. Mona's Clinic!! ")).toBe("dr-monas-clinic");
  });
  it("transliterates Arabic names", () => {
    expect(slugify("سنتر النور")).toBe("center-el-nor");
    expect(slugify("أكاديمية النجاح التجريبية")).toBe("academy-el-ngah-demo");
    expect(slugify("عيادة سمايل")).toBe("clinic-smail");
  });
  it("converts Arabic digits and strips diacritics", () => {
    expect(transliterate("سنتر ١٢٣")).toBe("center 123");
    expect(slugify("مَدْرَسَة")).toBe("mdrsa");
  });
  it("never returns an empty slug", () => {
    expect(slugify("!!!")).toBe("demo");
    expect(slugify("x".repeat(100)).length).toBeLessThanOrEqual(48);
  });
  it("validates slugs", () => {
    expect(isValidSlug("english-dose")).toBe(true);
    expect(isValidSlug("English")).toBe(false);
    expect(isValidSlug("-bad")).toBe(false);
    expect(isValidSlug("studio")).toBe(false);
    expect(isValidSlug("a--b")).toBe(false);
  });
});

describe("unique slugs", () => {
  it("adds -2, -3 when taken", async () => {
    const taken = new Set(["english-dose", "english-dose-2"]);
    expect(await uniqueSlug("English Dose", (s) => taken.has(s))).toBe("english-dose-3");
    expect(await uniqueSlug("New Place", (s) => taken.has(s))).toBe("new-place");
  });
  it("makes reserved words valid", async () => {
    const s = await uniqueSlug("Studio", () => false);
    expect(isValidSlug(s)).toBe(true);
  });
});
