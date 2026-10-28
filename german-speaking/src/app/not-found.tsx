"use client";

import Link from "next/link";
import { useUI } from "@/lib/client/ui";

export default function NotFound() {
  const { t } = useUI();
  return (
    <div className="py-24 text-center space-y-4">
      <p className="text-5xl font-extrabold">404</p>
      <p className="de" lang="de">
        Diese Seite gibt es leider nicht.
      </p>
      <Link href="/" className="btn btn-primary">
        {t("notfound_home")}
      </Link>
    </div>
  );
}
