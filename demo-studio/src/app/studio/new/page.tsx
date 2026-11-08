import { Editor } from "@/components/studio/Editor";
import { StudioShell } from "@/components/studio/StudioShell";
import { getSettings } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function NewDemo() {
  const s = await getSettings();
  return (
    <StudioShell wide>
      <Editor defaultExpiryDays={s.defaultExpiryDays} />
    </StudioShell>
  );
}
