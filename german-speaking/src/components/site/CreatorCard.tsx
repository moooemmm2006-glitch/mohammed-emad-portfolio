"use client";

import Link from "next/link";
import { useUI } from "@/lib/client/ui";
import { CHANNEL_NAME, type ClickPlace } from "@/lib/siteShared";
import { IconVideoPlay } from "../Icons";
import { TiltDiv } from "../level/Tilt";
import { useSite } from "./SiteProvider";

// The site owner and his YouTube channel. Calm placements only: the footer of every page and the end
// of the level pages — never between lessons, no pop-ups, nothing that plays by itself.

function ChannelAvatar({ photo, size }: { photo: string | null; size: number }) {
  return photo ? (
    // eslint-disable-next-line @next/next/no-img-element -- a small data URL from the admin page
    <img src={photo} alt="" width={size} height={size} className="rounded-full object-cover shrink-0 ring-2 ring-white/70 shadow" style={{ width: size, height: size }} />
  ) : (
    <span className="creator-avatar shrink-0 grid place-items-center rounded-full text-white font-extrabold shadow de" style={{ width: size, height: size, fontSize: size * 0.44 }} aria-hidden="true">
      M
    </span>
  );
}

export function SubscribeButton({ place, className = "", label }: { place: ClickPlace; className?: string; label?: string }) {
  const { t } = useUI();
  const { links, trackClick } = useSite();
  if (!links.channelUrl) return null;
  return (
    <a href={links.channelUrl} target="_blank" rel="noopener noreferrer" className={`btn btn-yt ${className}`} onClick={() => trackClick(place)}>
      <IconVideoPlay size={20} /> {label ?? t("yt_subscribe")}
    </a>
  );
}

/** Footer (full) or end of a level page (compact). Hidden when the admin removed the channel link. */
export function CreatorCard({ variant = "footer", showPause = true }: { variant?: "footer" | "compact"; showPause?: boolean }) {
  const { t } = useUI();
  const { links } = useSite();
  if (!links.channelUrl) return null;
  const compact = variant === "compact";
  return (
    <TiltDiv className={`creator-card rounded-3xl ${compact ? "p-4" : "p-4 sm:p-5"}`}>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <ChannelAvatar photo={links.channelPhoto} size={compact ? 44 : 52} />
        <div className="min-w-0 flex-1 basis-48">
          {compact ? (
            <p className="font-bold leading-snug">{t("yt_compact_title")}</p>
          ) : (
            <>
              <p className="font-extrabold leading-snug" dir="auto">
                {CHANNEL_NAME}
              </p>
              <p className="text-sm text-muted leading-relaxed">{t("yt_creator_line")}</p>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SubscribeButton place={compact ? "level_end" : "footer"} className="!min-h-[42px]" />
          {showPause && (
            <Link href="/pause" className="btn btn-ghost !min-h-[42px]">
              ☕ {t("pause_name")}
            </Link>
          )}
        </div>
      </div>
    </TiltDiv>
  );
}

/** End of a level page: the compact creator card and "زهقت؟ خد استراحة ☕". */
export function LevelEndCards() {
  const { t } = useUI();
  const { links } = useSite();
  return (
    <section aria-label={t("yt_compact_title")} className="mt-10 grid gap-3 sm:grid-cols-[1fr_auto]">
      {links.channelUrl ? <CreatorCard variant="compact" showPause={false} /> : <span />}
      <Link href="/pause" className="card depth rounded-3xl p-4 flex items-center gap-3 font-bold hover:shadow-lg transition">
        {t("pause_card")}
      </Link>
    </section>
  );
}

/** Slim footer on every page: creator card, follow / explainer links, credits. */
export function SiteFooter({ loggedIn }: { loggedIn: boolean }) {
  const { t } = useUI();
  const { links, openExplainer, trackClick } = useSite();
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 space-y-3">
      <CreatorCard showPause={loggedIn} />
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted">
        {links.channelUrl && (
          <a href={links.channelUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink min-h-[36px]" onClick={() => trackClick("footer")}>
            <IconVideoPlay size={18} /> {t("yt_follow")}
          </a>
        )}
        {links.explainerId && (
          <button type="button" className="inline-flex items-center gap-1.5 hover:text-ink min-h-[36px]" onClick={openExplainer}>
            ▶️ {t("yt_explainer_short")}
          </button>
        )}
        <span className="text-xs">{t("footer_credits")}</span>
      </div>
    </footer>
  );
}
