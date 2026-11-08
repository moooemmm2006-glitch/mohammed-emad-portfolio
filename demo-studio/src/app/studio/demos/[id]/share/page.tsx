import { notFound } from "next/navigation";
import { DemoTabs } from "@/components/studio/DemoTabs";
import { ShareKit } from "@/components/studio/ShareKit";
import { StudioShell } from "@/components/studio/StudioShell";
import { callScript } from "@/lib/demo/defaults";
import { toDTO } from "@/lib/dto";
import { getDemo, getSettings } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [d, s] = await Promise.all([getDemo(id), getSettings()]);
  if (!d) notFound();
  return (
    <StudioShell>
      <DemoTabs id={id} active="share" />
      <ShareKit demo={toDTO(d)} presets={s.presets} script={callScript(d.content)} />
    </StudioShell>
  );
}
