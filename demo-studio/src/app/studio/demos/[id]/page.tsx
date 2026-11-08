import { notFound } from "next/navigation";
import { DemoTabs } from "@/components/studio/DemoTabs";
import { Editor } from "@/components/studio/Editor";
import { StudioShell } from "@/components/studio/StudioShell";
import { toDTO } from "@/lib/dto";
import { getDemo, getSettings } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function EditDemo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [d, s] = await Promise.all([getDemo(id), getSettings()]);
  if (!d) notFound();
  return (
    <StudioShell wide>
      <DemoTabs id={id} active="edit" />
      <Editor initial={toDTO(d)} defaultExpiryDays={s.defaultExpiryDays} />
    </StudioShell>
  );
}
