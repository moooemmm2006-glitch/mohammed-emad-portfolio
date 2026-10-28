import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLevel } from "@/lib/levels";
import { LEVEL_COOKIE, levelPath } from "@/lib/paths";

// The start page is the learner's last level (A1 the first time).
export default async function Home() {
  const last = (await cookies()).get(LEVEL_COOKIE)?.value?.toUpperCase();
  redirect(levelPath(isLevel(last) ? last : "A1"));
}
