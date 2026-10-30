"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { SOON } from "@/components/AppShell";
import { IconBook, IconMic } from "@/components/Icons";
import { useUI } from "@/lib/client/ui";

export default function SoonPage() {
  const { t } = useUI();
  const { section } = useParams<{ section: string }>();
  const s = SOON.find((x) => x.slug === section);
  return (
    <div className="max-w-xl mx-auto text-center py-16">
      <span className="inline-grid place-items-center w-16 h-16 rounded-2xl bg-surface-2 text-gold">
        <IconBook size={32} />
      </span>
      <h1 className="mt-5 text-3xl font-extrabold">
        {s ? t(s.key) : t("nav_soon")}
      </h1>
      <p className="mt-2 inline-block rounded-full bg-surface-2 px-3 py-1 text-sm">{t("nav_soon")}</p>
      <p className="mt-6 text-muted">{t("soon_body")}</p>
      <Link href="/" className="btn btn-primary mt-8">
        <IconMic /> {t("soon_cta")}
      </Link>
    </div>
  );
}
