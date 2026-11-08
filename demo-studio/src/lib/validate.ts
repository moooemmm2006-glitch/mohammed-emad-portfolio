import type { z } from "zod";

/** First zod issue as a short Arabic message. */
export function zodMessage(err: z.ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "البيانات مش مظبوطة";
  const field = issue.path.join(".");
  const custom = issue.message && /[؀-ۿ]/.test(issue.message) ? issue.message : "";
  if (custom) return custom;
  const names: Record<string, string> = {
    name: "اسم البيزنس", phone: "رقم التليفون", whatsapp: "رقم الواتساب", slug: "الرابط", tagline: "الجملة التعريفية",
    address: "العنوان", mapsUrl: "لينك الخريطة", ownerName: "الاسم", portfolioUrl: "رابط البورتفوليو",
  };
  const label = names[issue.path[issue.path.length - 1] as string] || field || "حقل";
  if (issue.code === "too_big") return `${label}: النص طويل زيادة`;
  if (issue.code === "too_small") return `${label}: مطلوب`;
  return `${label}: القيمة مش مظبوطة`;
}
