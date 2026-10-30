import type { TKey } from "@/lib/client/i18n";

type Translate = (key: TKey) => string;

/** Small key adapters; all user-facing copy lives in messages/*.json. */
export function cafeText(t: Translate, key: string, vars?: Record<string, string | number>) {
  const value = t(`cafe_${key}` as TKey);
  return vars ? value.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? "")) : value;
}

export function categoryText(t: Translate, key: string) {
  return t(`cafe_category_${key}` as TKey);
}

export function weekdayText(t: Translate, day: number) {
  return t(`cafe_weekday_${day}` as TKey);
}
