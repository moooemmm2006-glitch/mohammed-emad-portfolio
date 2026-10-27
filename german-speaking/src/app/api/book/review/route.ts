import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth/session";
import { sentencesByNumber } from "@/lib/book";
import { dueReview } from "@/lib/bookProgress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "مراجعة النهارده": sentences said wrong before that are due again today.
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const due = await dueReview(user.id);
  const found = await sentencesByNumber(due.map((d) => d.n));
  return NextResponse.json({
    items: due.flatMap((d) => {
      const s = found.get(d.n);
      return s ? [{ n: d.n, topic: d.topic, level: s.level, de: s.de, ar: s.ar, best: d.best, stage: d.stage }] : [];
    }),
  });
}
