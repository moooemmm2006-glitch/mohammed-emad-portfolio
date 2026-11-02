"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { YouTubePlayer } from "@/components/videos/YouTubePlayer";
import { api } from "@/lib/client/api";
import { useUI } from "@/lib/client/ui";
import { CREATOR_INFO, subscribeUrl, type ProductivityItem } from "@/lib/productivityShared";

// ⭐ The one featured video (chosen in the admin panel) at the very top of the home page.
// Official YouTube embed, loaded on tap; nothing is shown until the admin picks one.
export function FeaturedVideo() {
  const { t, lang } = useUI();
  const [items, setItems] = useState<ProductivityItem[]>([]);
  useEffect(() => {
    api<{ items: ProductivityItem[] }>("/api/productivity").then((d) => setItems(d.items), () => {});
  }, []);
  const v = items.find((i) => i.kind === "featured" && i.youtubeId);
  if (!v) return null;
  const info = CREATOR_INFO[v.creator];
  const name = lang === "ar" ? info.ar : info.latin;
  const channel = items.find((i) => i.kind === "channel" && i.creator === v.creator);
  return (
    <section aria-labelledby="featured-title" className="grid gap-6 rounded-[2rem] border border-line bg-surface p-4 sm:p-6 shadow-[var(--shadow)] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center" data-testid="featured-video">
      <YouTubePlayer videoId={v.youtubeId!} title={v.title} />
      <div className="space-y-3">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#0f766e]" lang="de">
          ⭐ Empfohlen
        </p>
        <h2 id="featured-title" className="text-2xl sm:text-3xl font-extrabold leading-tight" dir="auto">
          {v.title}
        </h2>
        <p className="text-muted leading-relaxed">{t("prod_featured_sub")}</p>
        <p className="font-bold">
          {name}
          {info.channel !== name && <span className="font-semibold text-muted"> · <span dir="auto">{info.channel}</span></span>}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {channel && (
            <a href={subscribeUrl(channel.url)} target="_blank" rel="noopener noreferrer" className="btn btn-yt">
              ▶ {t("prod_subscribe")}
            </a>
          )}
          <Link href="/productivity" className="btn btn-ghost">
            {t("prod_featured_more")}
          </Link>
        </div>
      </div>
    </section>
  );
}
