"use client";
import { useEffect } from "react";

/**
 * Privacy-friendly engagement tracking (no cookies, no third parties):
 * a view, then pings with time on page, scroll depth, seen sections; CTA clicks as events.
 */
export function Tracker({ slug, enabled }: { slug: string; enabled: boolean }) {
  useEffect(() => {
    if (!enabled) {
      window.__demoTrack = () => {};
      return;
    }
    const url = "/api/t";
    let visitId: number | null = null;
    let maxScroll = 0;
    const seen = new Set<string>();
    let activeMs = 0;
    let lastTick = Date.now();
    let visible = !document.hidden;
    const queue: { type: string; label?: string }[] = [];

    const tickTime = () => {
      const now = Date.now();
      if (visible) activeMs += Math.min(now - lastTick, 30_000);
      lastTick = now;
    };
    const send = (body: object, beacon = false) => {
      const data = JSON.stringify({ slug, ...body });
      if (beacon && navigator.sendBeacon) return navigator.sendBeacon(url, new Blob([data], { type: "application/json" }));
      return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: data, keepalive: true }).then((r) => r.json()).catch(() => null);
    };
    const ping = (final = false) => {
      if (visitId == null) return;
      tickTime();
      send({ type: "ping", visitId, durationMs: activeMs, scroll: maxScroll, sections: [...seen] }, final);
    };

    window.__demoTrack = (type: string, label?: string) => {
      if (visitId == null) { queue.push({ type, label }); return; }
      tickTime();
      send({ type: "event", visitId, event: type, label, durationMs: activeMs, scroll: maxScroll, sections: [...seen] });
    };

    const device = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : /iPad|Tablet/i.test(navigator.userAgent) ? "tablet" : "desktop";
    (send({ type: "view", device, referrer: document.referrer.slice(0, 200) }) as Promise<{ visitId?: number } | null>).then((r) => {
      if (!r?.visitId) return;
      visitId = r.visitId;
      queue.splice(0).forEach((e) => window.__demoTrack?.(e.type, e.label));
    });

    const onScroll = () => {
      const h = document.documentElement;
      const pct = Math.round(((h.scrollTop + window.innerHeight) / h.scrollHeight) * 100);
      if (pct > maxScroll) maxScroll = Math.min(100, pct);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) seen.add((e.target as HTMLElement).dataset.section || "");
    }, { threshold: 0.35 });
    document.querySelectorAll<HTMLElement>("[data-section]").forEach((el) => io.observe(el));

    const onVis = () => {
      tickTime();
      visible = !document.hidden;
      if (document.hidden) ping(true);
    };
    document.addEventListener("visibilitychange", onVis);
    const onHide = () => ping(true);
    window.addEventListener("pagehide", onHide);
    const first = setTimeout(() => ping(), 15_000);
    const every = setInterval(() => ping(), 30_000);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
      io.disconnect();
      clearTimeout(first);
      clearInterval(every);
    };
  }, [slug, enabled]);
  return null;
}
