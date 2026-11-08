"use client";
import { useEffect, useRef } from "react";
import { useToast } from "./StudioShell";

type Item = { id: number; demoId: string; type: string; label: string; createdAt: number; name: string };
const TEXT: Record<string, (n: string) => string> = {
  open: (n) => `🔥 ${n} فتح النموذج دلوقتي`,
  reopen: (n) => `👀 ${n} رجع فتح النموذج`,
  cta_contact: (n) => `📞 ${n} ضغط «كلّمني»!`,
  cta_call: (n) => `📞 ${n} ضغط زر الاتصال`,
  form_submit: (n) => `📝 ${n} جرّب فورم الحجز`,
};

/** Polls for new engagement and shows a live toast anywhere in the studio. */
export function LiveActivity() {
  const toast = useToast();
  const since = useRef(Date.now());
  useEffect(() => {
    let stop = false;
    async function tick() {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/studio/activity?since=${since.current}`);
        if (!res.ok) return;
        const { items } = (await res.json()) as { items: Item[] };
        if (stop || !items.length) return;
        since.current = Math.max(since.current, ...items.map((i) => i.createdAt));
        items.slice(0, 3).reverse().forEach((i) => toast({ text: (TEXT[i.type] || ((n: string) => n))(i.name), tone: "hot", href: `/studio/demos/${i.demoId}?tab=activity` }));
        window.dispatchEvent(new CustomEvent("studio:activity"));
      } catch { /* offline */ }
    }
    const t = setInterval(tick, 15000);
    return () => { stop = true; clearInterval(t); };
  }, [toast]);
  return null;
}
