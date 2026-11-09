import { describe, expect, it } from "vitest";
import { csvToLeads, mapHeader, parseCsv } from "@/lib/csv";

describe("CSV parsing", () => {
  it("handles quotes, commas and newlines inside cells", () => {
    expect(parseCsv('a,b\n"x, y","line1\nline2"\n')).toEqual([["a", "b"], ["x, y", "line1\nline2"]]);
    expect(parseCsv('"he said ""hi"""')).toEqual([['he said "hi"']]);
  });
  it("detects semicolon and tab separators and strips BOM", () => {
    expect(parseCsv("﻿name;phone\nA;010")).toEqual([["name", "phone"], ["A", "010"]]);
    expect(parseCsv("name\tphone\nA\t010")).toEqual([["name", "phone"], ["A", "010"]]);
  });
});

describe("lead tracker mapping", () => {
  it("maps English and Arabic headers in any order", () => {
    expect(mapHeader(["phone", "name", "type", "area", "link", "notes"])).toMatchObject({ name: 1, phone: 0, type: 2 });
    expect(mapHeader(["الاسم", "النوع", "المنطقة", "التليفون"])).toMatchObject({ name: 0, type: 1, area: 2, phone: 3, link: -1 });
  });
  it("turns rows into leads with niche, phone and links", () => {
    const { leads, hasHeader } = csvToLeads(`name,type,area,phone,link,notes
English Dose,سنتر انجليزي,مدينة نصر,+20 101 234 5678,https://maps.app.goo.gl/x,كلّمته
Smile Clinic,Dental clinic,Maadi,01112345678,,
Lamsa,instagram shop,Zayed,01212345678,https://instagram.com/lamsa,
No Phone Co,something,,12345,,`);
    expect(hasHeader).toBe(true);
    expect(leads[0]).toMatchObject({ name: "English Dose", niche: "courses", phone: "01012345678", mapsUrl: "https://maps.app.goo.gl/x", notes: "كلّمته" });
    expect(leads[1].niche).toBe("clinic");
    expect(leads[2]).toMatchObject({ niche: "shop", instagram: "https://instagram.com/lamsa", mapsUrl: "" });
    expect(leads[3].niche).toBeNull();
    expect(leads[3].error).toBeTruthy();
  });
  it("accepts rows without a header in the documented order", () => {
    const { leads, hasHeader } = csvToLeads("سنتر الأوائل,دروس,شبرا,01012345678,,");
    expect(hasHeader).toBe(false);
    expect(leads[0]).toMatchObject({ name: "سنتر الأوائل", niche: "courses", area: "شبرا" });
  });
});
