import { Dashboard } from "@/components/studio/Dashboard";
import { StudioShell } from "@/components/studio/StudioShell";
import { toDTO } from "@/lib/dto";
import { listDemos } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function StudioHome() {
  const demos = (await listDemos()).map((d) => toDTO(d));
  return (
    <StudioShell>
      <Dashboard initial={demos} />
    </StudioShell>
  );
}
