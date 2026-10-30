"use client";

import { useUI } from "@/lib/client/ui";

export function AdminForbidden() {
  const { t } = useUI();
  return <p className="card p-6 text-center">{t("admin_forbidden")}</p>;
}
