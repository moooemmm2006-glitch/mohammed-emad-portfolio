import type { CSSProperties } from "react";
import { phrases } from "@/lib/demo/defaults";
import type { DemoContent, Niche, RenderMode, Style } from "@/lib/demo/model";
import { FONT_PAIR_VARS } from "@/lib/fontPairs";
import { themeVars } from "@/lib/palette";
import { OWNER } from "@/lib/owner";
import { TemplateRuntime } from "./runtime";
import type { T } from "./parts";
import * as S from "./sections";

/**
 * The template engine: one data model → niche × style. Styles differ in layout, typography
 * and section order, not only colours. Adding a niche = a bank in lib/demo/niches.ts + a line here.
 */
type SectionKey = "items" | "schedule" | "people" | "why" | "results" | "testimonials" | "beforeAfter" | "notes" | "delivery" | "form" | "location" | "faq" | "gallery" | "closing";

export const LAYOUTS: Record<Niche, Record<Style, SectionKey[]>> = {
  courses: {
    bold: ["items", "schedule", "why", "people", "results", "form", "gallery", "location", "faq", "closing"],
    calm: ["why", "people", "items", "schedule", "form", "results", "gallery", "faq", "location", "closing"],
  },
  clinic: {
    bold: ["items", "people", "form", "beforeAfter", "notes", "testimonials", "gallery", "location", "faq", "closing"],
    calm: ["people", "items", "notes", "beforeAfter", "gallery", "testimonials", "form", "faq", "location", "closing"],
  },
  shop: {
    bold: ["items", "why", "delivery", "gallery", "testimonials", "faq", "form", "location", "closing"],
    calm: ["why", "items", "delivery", "gallery", "faq", "testimonials", "location", "closing"],
  },
};

const RENDER: Record<SectionKey, (p: { t: T }) => React.ReactNode> = {
  items: S.Items, schedule: S.Schedule, people: S.People, why: S.Why, results: S.Results, testimonials: S.Testimonials,
  beforeAfter: S.BeforeAfter, notes: S.Notes, delivery: S.Delivery, form: S.FormSection, location: S.Location, faq: S.Faq,
  gallery: S.Gallery, closing: S.Closing,
};

export function themeStyle(c: DemoContent): CSSProperties {
  const vars = themeVars(c.brand.primary, c.brand.accent, c.brand.mode);
  const font = FONT_PAIR_VARS[c.brand.font] || FONT_PAIR_VARS["cairo-tajawal"];
  return { ...vars, "--fh": font.h, "--fb": font.b, colorScheme: c.brand.mode } as CSSProperties;
}

export function Template({ content, slug, mode, ownerWhatsapp = OWNER.whatsapp, children }: {
  content: DemoContent; slug: string; mode: RenderMode; ownerWhatsapp?: string; children?: React.ReactNode;
}) {
  const t: T = {
    c: content,
    seed: slug,
    mode,
    style: content.style,
    ph: phrases(content, slug),
    phone: content.phone || content.whatsapp,
    wa: content.whatsapp || content.phone,
    dark: content.brand.mode === "dark",
    ownerWa: ownerWhatsapp,
  };
  const order = LAYOUTS[content.niche][content.style];
  return (
    <div className="tpl min-h-dvh antialiased" style={themeStyle(content)} data-template={`${content.niche}-${content.style}`}>
      <TemplateRuntime mode={mode} slug={slug} name={content.name} phone={t.phone} whatsapp={t.wa} ownerWhatsapp={ownerWhatsapp}>
        {children}
        <main>
          <S.Hero t={t} />
          {order.map((k) => {
            const Comp = RENDER[k];
            return <Comp key={k} t={t} />;
          })}
        </main>
        <S.Footer t={t} />
        <S.StickyBar t={t} />
      </TemplateRuntime>
    </div>
  );
}
