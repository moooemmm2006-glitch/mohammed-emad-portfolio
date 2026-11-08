import { notFound } from "next/navigation";
import { DemoTabs } from "@/components/studio/DemoTabs";
import { SitePanel } from "@/components/studio/SitePanel";
import { StudioShell } from "@/components/studio/StudioShell";
import { toDTO } from "@/lib/dto";
import { getDemo, listSubmissions } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function SiteTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getDemo(id);
  if (!d) notFound();
  const subs = await listSubmissions(id);
  return (
    <StudioShell>
      <DemoTabs id={id} active="site" />
      <SitePanel demo={toDTO(d)} submissions={subs.map((s) => ({ id: s.id, createdAt: s.createdAt, data: JSON.parse(s.data) as Record<string, string> }))} />
    </StudioShell>
  );
}
