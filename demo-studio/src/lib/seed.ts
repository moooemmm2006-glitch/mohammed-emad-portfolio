import { eq } from "drizzle-orm";
import type { DB } from "./db";
import { demos, settings } from "./db/schema";
import { buildContent } from "./demo/defaults";
import { defaultHours, uid } from "./demo/model";

/**
 * Three clearly fictional samples, one per niche, to show the templates off (portfolio showcase).
 * Never real businesses. Seeded once; deleting them later is respected.
 */
export const SAMPLE_SLUGS = { courses: "sample-academy", clinic: "sample-clinic", shop: "sample-shop" } as const;

export function sampleContents() {
  const academy = buildContent({
    niche: "courses",
    style: "bold",
    name: "أكاديمية النجاح التجريبية",
    nameEn: "Al Nagah Demo Academy",
    tagline: "مكانك الصح عشان تذاكر صح وتقفل المادة",
    phone: "01000000000",
    whatsapp: "01000000000",
    area: "مدينة نصر",
    address: "عنوان تجريبي — مدينة نصر، القاهرة",
    brand: { paletteId: "cobalt", primary: "#2E5BFF", accent: "#F5B841", font: "cairo-tajawal", mode: "light" },
  }, SAMPLE_SLUGS.courses);

  const clinic = buildContent({
    niche: "clinic",
    style: "calm",
    clinicType: "dental",
    name: "عيادة سمايل التجريبية",
    nameEn: "Smile Demo Clinic",
    tagline: "ابتسامتك وصحتك في إيد أمينة",
    phone: "01100000000",
    whatsapp: "01100000000",
    area: "المعادي",
    address: "عنوان تجريبي — المعادي، القاهرة",
    hours: defaultHours().map((h, i) => (i === 6 ? { ...h, open: false } : { open: true, from: "12:00", to: "21:00" })),
    brand: { paletteId: "mint", primary: "#0E9F8E", accent: "#0B4F6C", font: "readex-plex", mode: "light" },
  }, SAMPLE_SLUGS.clinic);

  const shop = buildContent({
    niche: "shop",
    style: "bold",
    name: "متجر لمسة التجريبي",
    nameEn: "Lamsa Demo Store",
    tagline: "قطع مختارة بعناية… وتوصيل لحد عندك",
    phone: "01200000000",
    whatsapp: "01200000000",
    area: "الشيخ زايد",
    services: [
      { id: uid("s"), title: "شنطة كروس جلد", desc: "جلد طبيعي، 3 ألوان.", tag: "شنط", price: "", image: "" },
      { id: uid("s"), title: "شال كتان", desc: "خامة خفيفة للصيف.", tag: "إكسسوارات", price: "", image: "" },
      { id: uid("s"), title: "محفظة صغيرة", desc: "مناسبة للهدايا.", tag: "شنط", price: "", image: "" },
      { id: uid("s"), title: "توكة شعر لؤلؤ", desc: "طقم من قطعتين.", tag: "إكسسوارات", price: "", image: "" },
      { id: uid("s"), title: "بوكس هدية", desc: "تغليف جاهز للإهداء.", tag: "هدايا", price: "", image: "" },
      { id: uid("s"), title: "شنطة توت", desc: "قماش كانفاس مطبوع.", tag: "شنط", price: "", image: "" },
    ],
    brand: { paletteId: "rose", primary: "#BE185D", accent: "#FBBF24", font: "tajawal-cairo", mode: "dark" },
  }, SAMPLE_SLUGS.shop);

  return [
    { slug: SAMPLE_SLUGS.courses, content: academy },
    { slug: SAMPLE_SLUGS.clinic, content: clinic },
    { slug: SAMPLE_SLUGS.shop, content: shop },
  ];
}

export async function seedSamples(db: DB): Promise<void> {
  const [flag] = await db.select().from(settings).where(eq(settings.key, "seeded_v1")).limit(1);
  if (flag) return;
  const now = Date.now();
  const far = now + 3650 * 86_400_000;
  for (const s of sampleContents()) {
    await db.insert(demos).values({
      id: s.slug,
      slug: s.slug,
      status: "sent",
      niche: s.content.niche,
      style: s.content.style,
      name: s.content.name,
      content: JSON.stringify(s.content),
      note: "نموذج تجريبي للعرض في البورتفوليو (اسم وهمي).",
      source: "seed",
      isSample: 1,
      expiresAt: far,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing();
  }
  await db.insert(settings).values({ key: "seeded_v1", value: String(now) }).onConflictDoNothing();
}
