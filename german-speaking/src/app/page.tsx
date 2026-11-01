import type { Metadata } from "next";
import { cookies } from "next/headers";
import { HomePage } from "@/components/home/HomePage";
import { isLevel } from "@/lib/levels";
import { LEVEL_COOKIE } from "@/lib/paths";

export const metadata: Metadata = { title: "الرئيسية" };

// 🏠 The home page: welcome + continue, the intro video, the four levels, everything on the site.
export default async function Home() {
  const last = (await cookies()).get(LEVEL_COOKIE)?.value?.toUpperCase();
  return <HomePage lastLevel={isLevel(last) ? last : null} />;
}
