"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SubscribeButton } from "@/components/site/CreatorCard";
import { useSite } from "@/components/site/SiteProvider";
import { YouTubePlaylist } from "@/components/videos/YouTubePlayer";
import { useUI } from "@/lib/client/ui";

/** "شروحات الموقع": the tutorials playlist — only when the admin saved one. */
export default function TutorialsPage() {
  const { t } = useUI();
  const router = useRouter();
  const { links } = useSite();
  useEffect(() => {
    if (!links.playlistId) router.replace("/");
  }, [links.playlistId, router]);
  if (!links.playlistId) return null;
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold">🎓 {t("yt_tutorials")}</h1>
        <p className="text-muted">{t("yt_tutorials_intro")}</p>
      </header>
      <div className="card depth p-4 sm:p-5 space-y-4">
        <YouTubePlaylist listId={links.playlistId} title={t("yt_tutorials")} poster={links.explainerId} />
        <SubscribeButton place="tutorials" />
      </div>
    </div>
  );
}
