import { pick, pickN } from "../seedRandom";
import { PALETTES } from "../palette";
import { ContentSchema, defaultHours, uid, type ClinicType, type DemoContent, type Niche, type Style } from "./model";
import { BANKS, CLINIC_SPEC, DEFAULT_PEOPLE, DEFAULT_SCHEDULE, DEFAULT_SERVICES, DEFAULT_TEXT, fill } from "./niches";

function serviceKey(niche: Niche, clinicType: ClinicType) {
  return niche === "clinic" ? (`clinic:${clinicType}` as const) : niche;
}

/** A tagline variant for this seed ("اقترح" cycles `offset`). */
export function suggestTagline(niche: Niche, seed: string, opts: { area?: string; clinicType?: ClinicType; offset?: number } = {}): string {
  const bank = BANKS[niche];
  const base = bank.taglines.indexOf(pick(bank.taglines, seed, "tagline"));
  const t = bank.taglines[(base + (opts.offset || 0)) % bank.taglines.length];
  return fill(t, { area: opts.area, spec: CLINIC_SPEC[opts.clinicType || "dental"] });
}

export function defaultWhy(niche: Niche, seed: string, clinicType: ClinicType = "dental") {
  const set = pick(BANKS[niche].whySets, seed, "why");
  return set.map((p) => ({ id: uid("w"), t: fill(p.t, { spec: CLINIC_SPEC[clinicType] }), d: fill(p.d, { spec: CLINIC_SPEC[clinicType] }) }));
}

export function defaultFaq(niche: Niche, seed: string) {
  return pickN(BANKS[niche].faqPool, 5, seed, "faq").map((f) => ({ id: uid("f"), ...f }));
}

export function defaultServices(niche: Niche, clinicType: ClinicType = "dental") {
  return DEFAULT_SERVICES[serviceKey(niche, clinicType)].map((s) => ({ id: uid("s"), ...s, price: "", image: "" }));
}

export function defaultPeople(niche: Niche, clinicType: ClinicType = "dental") {
  return DEFAULT_PEOPLE[serviceKey(niche, clinicType)].map((p) => ({ id: uid("p"), ...p }));
}

export type BuildInput = Partial<Omit<DemoContent, "brand">> & {
  niche: Niche;
  style?: Style;
  name: string;
  brand?: Partial<DemoContent["brand"]>;
};

/** A complete, valid content object: given fields + niche defaults picked by the slug seed. */
export function buildContent(input: BuildInput, seed: string): DemoContent {
  const niche = input.niche;
  const clinicType = input.clinicType || "dental";
  const palette = PALETTES.find((p) => p.id === (input.brand?.paletteId || BANKS[niche].defaultPalette)) || PALETTES[0];
  const styles: Style[] = ["bold", "calm"];
  const raw = {
    niche,
    style: input.style || pick(styles, seed, "style"),
    clinicType,
    name: input.name,
    nameEn: input.nameEn || "",
    tagline: input.tagline || suggestTagline(niche, seed, { area: input.area, clinicType }),
    intro: input.intro || "",
    phone: input.phone || "",
    whatsapp: input.whatsapp || input.phone || "",
    area: input.area || "",
    address: input.address || "",
    mapsUrl: input.mapsUrl || "",
    hours: input.hours || defaultHours(),
    services: input.services?.length ? input.services : defaultServices(niche, clinicType),
    schedule: input.schedule?.length ? input.schedule : niche === "courses" ? DEFAULT_SCHEDULE.map((s) => ({ id: uid("c"), ...s })) : [],
    seats: input.seats ?? (niche === "courses" ? "باقي أماكن قليلة في مجموعات الترم ده" : ""),
    people: input.people?.length ? input.people : defaultPeople(niche, clinicType),
    why: input.why?.length ? input.why : defaultWhy(niche, seed, clinicType),
    faq: input.faq?.length ? input.faq : defaultFaq(niche, seed),
    insurance: input.insurance ?? (niche === "clinic" ? DEFAULT_TEXT.insurance : ""),
    delivery: input.delivery ?? (niche === "shop" ? DEFAULT_TEXT.delivery : ""),
    returns: input.returns ?? (niche === "shop" ? DEFAULT_TEXT.returns : ""),
    instagram: input.instagram || "",
    brand: {
      logo: "",
      paletteId: palette.id,
      primary: palette.primary,
      accent: palette.accent,
      font: "cairo-tajawal" as const,
      mode: "light" as const,
      ...input.brand,
    },
    photos: input.photos || [],
  };
  return ContentSchema.parse(raw);
}

/** Copy that is not stored: picked by the seed at render time. */
export function phrases(content: DemoContent, seed: string) {
  const bank = BANKS[content.niche];
  const vars = { name: content.name, area: content.area, spec: CLINIC_SPEC[content.clinicType] };
  return {
    heroSub: content.intro || fill(pick(bank.heroSubs, seed, "sub"), vars),
    ctaMain: pick(bank.ctaMain, seed, "cta"),
    ctaSoft: pick(bank.ctaSoft, seed, "cta2"),
    formTitle: pick(bank.formTitles, seed, "form"),
    closing: pick(bank.closing, seed, "closing"),
    bank,
  };
}

export function callScript(content: DemoContent): string[] {
  return BANKS[content.niche].callScript.map((l) => fill(l, { name: content.name }));
}
