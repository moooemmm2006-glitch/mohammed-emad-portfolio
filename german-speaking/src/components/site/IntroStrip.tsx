"use client";

import { useMe } from "@/lib/client/me";
import { useUI } from "@/lib/client/ui";
import { IconX } from "../Icons";
import { useSite } from "./SiteProvider";

/** Top of the level pages: "أول مرة هنا؟ ▶️ شوف شرح الموقع في دقيقتين" — closable, remembered per account. */
export function IntroStrip() {
  const { t } = useUI();
  const { me, setPrefs } = useMe();
  const { links, openExplainer } = useSite();
  if (!links.explainerId || !me?.prefs || me.prefs.introDismissed) return null;
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-line/70 bg-surface/70 ps-4 pe-1.5 py-1.5 text-sm backdrop-blur">
      <button type="button" className="flex-1 text-start font-semibold min-h-[36px] hover:underline underline-offset-4" onClick={openExplainer}>
        {t("yt_strip")}
      </button>
      <button type="button" className="grid place-items-center w-9 h-9 rounded-full hover:bg-surface-2" aria-label={t("yt_strip_close")} onClick={() => setPrefs({ introDismissed: true })}>
        <IconX size={16} />
      </button>
    </div>
  );
}
