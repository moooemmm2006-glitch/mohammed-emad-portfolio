import { SettingsForm } from "@/components/studio/SettingsForm";
import { StudioShell } from "@/components/studio/StudioShell";
import { dbTarget } from "@/lib/db";
import { getSettings } from "@/lib/repo";
import { telegramConfigured } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await getSettings();
  const env = {
    telegram: telegramConfigured(),
    blob: !!process.env.BLOB_READ_WRITE_TOKEN,
    db: dbTarget().kind,
    password: !!process.env.STUDIO_PASSWORD,
    secret: (process.env.AUTH_SECRET || "").length >= 16,
  };
  return (
    <StudioShell>
      <SettingsForm initial={s} env={env} />
    </StudioShell>
  );
}
